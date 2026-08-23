import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";

// POST /api/v1/registrations/[id]/fulfill
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      roomId,
      assignedRoomNumber,
      departureDate,
      depositAmount = 0,
      depositMethod = "CASH",
      depositRef = "",
      notes = "",
      userId,
      idPhotoUrl,
      idDocumentType,
      idDocumentNumber,
      coGuests,
    } = body;

    const registration = await prisma.guestRegistration.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.status === "CHECKED_IN") {
      return NextResponse.json({ error: "Registration is already checked in" }, { status: 400 });
    }

    // Resolve room
    let targetRoom = null;
    if (roomId) {
      targetRoom = await prisma.room.findUnique({
        where: { id: roomId },
        include: { roomType: true, roomState: true },
      });
    } else if (assignedRoomNumber || registration.preAssignedRoom) {
      const roomNum = assignedRoomNumber || registration.preAssignedRoom;
      targetRoom = await prisma.room.findFirst({
        where: { propertyId: registration.propertyId, number: roomNum },
        include: { roomType: true, roomState: true },
      });
    }

    if (!targetRoom) {
      return NextResponse.json({ error: "Please select or assign a valid room to complete check-in." }, { status: 400 });
    }

    // Check if room is already occupied
    const activeAssignment = await prisma.roomAssignment.findFirst({
      where: {
        roomId: targetRoom.id,
        endsAt: null,
        stay: { status: "IN_HOUSE" },
      },
    });

    if (activeAssignment || targetRoom.roomState?.occupancyStatus === "OCCUPIED") {
      return NextResponse.json(
        { error: `Room ${targetRoom.number} is already occupied by an in-house guest.` },
        { status: 400 }
      );
    }

    const finalIdPhotoUrl = idPhotoUrl || registration.idPhotoUrl;
    const finalIdDocType = idDocumentType || registration.idDocumentType;
    const finalIdDocNum = idDocumentNumber || registration.idDocumentNumber;
    const finalCoGuestsJson = coGuests ? JSON.stringify(coGuests) : registration.coGuestsJson;

    // 1. Find or create Guest
    let guest = await prisma.guest.findFirst({
      where: {
        organizationId: registration.organizationId,
        OR: [
          { phone: registration.mobilePhone },
          ...(registration.email ? [{ email: registration.email }] : []),
        ],
      },
    });

    const addressJson = JSON.stringify({
      street: registration.streetAddress,
      city: registration.city,
      state: registration.state,
      postalCode: registration.pinZipCode,
      country: registration.country,
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          organizationId: registration.organizationId,
          name: registration.fullName,
          phone: registration.mobilePhone,
          email: registration.email,
          nationality: registration.nationality,
          addressJson,
          preferences: registration.purposeOfVisit ? `Purpose: ${registration.purposeOfVisit}` : null,
        },
      });
    } else {
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          name: registration.fullName,
          addressJson,
        },
      });
    }

    // 2. Save primary ID document if provided
    if (finalIdDocNum || finalIdPhotoUrl) {
      await prisma.guestDocument.create({
        data: {
          guestId: guest.id,
          propertyId: registration.propertyId,
          documentType: finalIdDocType || "AADHAAR",
          last4: finalIdDocNum ? finalIdDocNum.slice(-4) : "ID",
          issuerCountry: registration.country || "India",
          objectKey: finalIdPhotoUrl || null,
        },
      });
    }

    // Save co-guest documents for police verification if photos provided
    if (coGuests && Array.isArray(coGuests)) {
      for (const cg of coGuests) {
        if (cg.idPhotoUrl || cg.idNumber) {
          await prisma.guestDocument.create({
            data: {
              guestId: guest.id,
              propertyId: registration.propertyId,
              documentType: cg.idType || "AADHAAR",
              last4: cg.idNumber ? cg.idNumber.slice(-4) : "ID",
              issuerCountry: "India",
              objectKey: cg.idPhotoUrl || null,
            },
          });
        }
      }
    }

    // 3. Create PMS Stay
    const arrivalDate = new Date();
    const expDepDate = departureDate
      ? new Date(departureDate)
      : registration.expectedDepartureDate
      ? new Date(registration.expectedDepartureDate)
      : new Date(Date.now() + 86400000 * 2);

    let coGuestsCount = 0;
    if (registration.coGuestsJson) {
      try {
        const parsed = JSON.parse(registration.coGuestsJson);
        if (Array.isArray(parsed)) coGuestsCount = parsed.length;
      } catch {}
    }

    const stay = await prisma.stay.create({
      data: {
        organizationId: registration.organizationId,
        propertyId: registration.propertyId,
        primaryGuestId: guest.id,
        status: "IN_HOUSE",
        arrivalAt: arrivalDate,
        expectedDepartureAt: expDepDate,
        adults: 1 + coGuestsCount,
      },
    });

    // 4. Create Room Assignment & Update Room State
    await prisma.roomAssignment.create({
      data: {
        stayId: stay.id,
        roomId: targetRoom.id,
        startsAt: arrivalDate,
      },
    });

    await prisma.roomState.upsert({
      where: { roomId: targetRoom.id },
      create: {
        organizationId: registration.organizationId,
        propertyId: registration.propertyId,
        roomId: targetRoom.id,
        occupancyStatus: "OCCUPIED",
        housekeepingStatus: "CLEAN",
        sellabilityStatus: "SELLABLE",
      },
      update: {
        occupancyStatus: "OCCUPIED",
      },
    });

    // 5. Create Folio and Window
    const folio = await prisma.folio.create({
      data: {
        organizationId: registration.organizationId,
        propertyId: registration.propertyId,
        stayId: stay.id,
        status: "OPEN",
        balance: 0,
      },
    });

    const window = await prisma.folioWindow.create({
      data: {
        folioId: folio.id,
        name: "Guest Window",
        windowNumber: 1,
        payerType: "GUEST",
        status: "OPEN",
      },
    });

    await prisma.stay.update({
      where: { id: stay.id },
      data: { folioId: folio.id },
    });

    // 6. Post Initial Room Tariff Charge (SAC 996311)
    let roomBasePrice = 3200;
    if (targetRoom.roomTypeId) {
      const rateVersion = await prisma.ratePlanVersion.findFirst({
        where: { roomTypeId: targetRoom.roomTypeId, active: true },
        orderBy: { createdAt: "desc" },
      });
      if (rateVersion?.pricingJson) {
        try {
          const pricing = JSON.parse(rateVersion.pricingJson);
          if (pricing.basePrice) roomBasePrice = Number(pricing.basePrice);
        } catch {}
      }
    }

    const roomGst = calculateGST({
      grossOrBaseAmount: roomBasePrice,
      isInclusive: false,
      sacHsn: "996311",
      supplierStateCode: registration.property?.stateCode || "18",
    });

    const serviceDateStr = registration.property?.businessDate || new Date().toISOString().split("T")[0];

    await prisma.folioEntry.create({
      data: {
        organizationId: registration.organizationId,
        propertyId: registration.propertyId,
        folioId: folio.id,
        folioWindowId: window.id,
        serviceDate: serviceDateStr,
        type: "CHARGE",
        chargeCode: "ROOM_TARIFF",
        description: `Room Tariff - Room ${targetRoom.number} (${targetRoom.roomType?.name || "Room Charge"})`,
        qty: 1,
        unitAmount: roomBasePrice,
        taxableAmount: roomGst.taxableAmount,
        taxComponentsJson: JSON.stringify(roomGst.components),
        totalAmount: roomGst.totalAmount,
        sourceType: "PMS_NIGHTLY_CHARGE",
        status: "POSTED",
      },
    });

    let currentBalance = roomGst.totalAmount;

    // 7. Handle Advance Deposit if collected
    if (Number(depositAmount) > 0) {
      const depAmt = Number(depositAmount);
      const seq = await prisma.documentSequence.findFirst({
        where: { propertyId: registration.propertyId, documentType: "RECEIPT" },
      });
      const receiptNum = seq ? `${seq.prefix}${String(seq.nextValue).padStart(seq.padding, "0")}` : `REC-${Date.now().toString().slice(-6)}`;
      if (seq) {
        await prisma.documentSequence.update({
          where: { id: seq.id },
          data: { nextValue: { increment: 1 } },
        });
      }

      const payment = await prisma.payment.create({
        data: {
          organizationId: registration.organizationId,
          propertyId: registration.propertyId,
          folioId: folio.id,
          receiptNo: receiptNum,
          amount: depAmt,
          method: depositMethod || "CASH",
          status: "SUCCEEDED",
          reference: depositRef || `GRC-DEPOSIT-${registration.registrationNo}`,
          payerSnapshot: JSON.stringify({ name: registration.fullName, phone: registration.mobilePhone }),
        },
      });

      await prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          folioWindowId: window.id,
          amount: depAmt,
        },
      });

      currentBalance -= depAmt;
    }

    await prisma.folio.update({
      where: { id: folio.id },
      data: { balance: currentBalance },
    });

    // 7. Update Registration status
    const updatedReg = await prisma.guestRegistration.update({
      where: { id },
      data: {
        status: "CHECKED_IN",
        assignedRoomId: targetRoom.id,
        assignedRoomNumber: targetRoom.number,
        stayId: stay.id,
        guestId: guest.id,
        depositAmount: Number(depositAmount) || 0,
        processedByUserId: userId || null,
        processedAt: new Date(),
        internalNotes: notes || registration.internalNotes,
      },
    });

    // 8. Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: registration.organizationId,
        propertyId: registration.propertyId,
        action: "FULFILL_CHECKIN",
        targetType: "STAY",
        targetId: stay.id,
        beforeJson: JSON.stringify({ status: "PENDING_REVIEW" }),
        afterJson: JSON.stringify({
          stayId: stay.id,
          room: targetRoom.number,
          guest: guest.name,
          deposit: depositAmount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Guest successfully checked in to Room ${targetRoom.number}!`,
      stay,
      room: targetRoom,
      registration: updatedReg,
    });
  } catch (error: any) {
    console.error("Registration fulfillment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
