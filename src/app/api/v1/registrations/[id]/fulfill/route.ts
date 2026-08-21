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
    if (targetRoom.roomState?.occupancyStatus === "OCCUPIED") {
      return NextResponse.json({ error: `Room ${targetRoom.number} is already occupied.` }, { status: 400 });
    }

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

    // 2. Save ID document if provided
    if (registration.idDocumentNumber) {
      await prisma.guestDocument.create({
        data: {
          guestId: guest.id,
          propertyId: registration.propertyId,
          documentType: registration.idDocumentType || "AADHAAR",
          last4: registration.idDocumentNumber.slice(-4),
          issuerCountry: registration.country || "India",
          objectKey: registration.idPhotoUrl || null,
        },
      });
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

    // 6. Handle Advance Deposit if collected
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

      await prisma.payment.create({
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

      await prisma.folio.update({
        where: { id: folio.id },
        data: { balance: -depAmt },
      });
    }

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
