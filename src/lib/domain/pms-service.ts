import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";

export interface QuoteRequest {
  propertyId: string;
  roomTypeId: string;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  ratePlanId?: string;
}

export interface QuoteNight {
  serviceDate: string;
  baseAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  ratePlanName: string;
}

export interface QuoteResult {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  nightsCount: number;
  nights: QuoteNight[];
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  availableRoomsCount: number;
}

export async function calculateAvailability(
  propertyId: string,
  arrivalDate: string,
  departureDate: string
) {
  const rooms = await prisma.room.findMany({
    where: { propertyId, active: true },
    include: {
      roomType: true,
      roomState: true,
      blocks: {
        where: {
          status: "ACTIVE",
        },
      },
      assignments: {
        where: {
          endsAt: null, // active
        },
        include: {
          stay: true,
        },
      },
    },
  });

  // Calculate per room type
  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId, active: true },
  });

  return roomTypes.map((rt) => {
    const rtRooms = rooms.filter((r) => r.roomTypeId === rt.id);
    const totalRooms = rtRooms.length;
    const occupiedOrBlocked = rtRooms.filter((r) => {
      const isBlocked = (r.blocks?.length || 0) > 0;
      const isOccupied = (r.assignments?.length || 0) > 0;
      return isBlocked || isOccupied;
    }).length;

    const availableCount = Math.max(0, totalRooms - occupiedOrBlocked);

    return {
      roomTypeId: rt.id,
      roomTypeCode: rt.code,
      roomTypeName: rt.name,
      totalRooms,
      occupiedOrBlocked,
      availableCount,
      capacity: rt.capacity,
    };
  });
}

export async function quoteStay(req: QuoteRequest): Promise<QuoteResult> {
  const roomType = await prisma.roomType.findUniqueOrThrow({
    where: { id: req.roomTypeId },
  });

  const property = await prisma.property.findUniqueOrThrow({
    where: { id: req.propertyId },
  });

  // Default rate plan
  let ratePlan = req.ratePlanId
    ? await prisma.ratePlan.findUnique({
        where: { id: req.ratePlanId },
        include: { versions: { where: { roomTypeId: req.roomTypeId } } },
      })
    : await prisma.ratePlan.findFirst({
        where: { propertyId: req.propertyId, active: true },
        include: { versions: { where: { roomTypeId: req.roomTypeId } } },
      });

  const start = new Date(req.arrivalDate);
  const end = new Date(req.departureDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const baseRate = 3500; // Base default if version json not found
  const nights: QuoteNight[] = [];
  let subtotal = 0;
  let totalTax = 0;
  let totalAmount = 0;

  for (let i = 0; i < nightsCount; i++) {
    const current = new Date(start);
    current.setDate(current.getDate() + i);
    const serviceDate = current.toISOString().split("T")[0];

    const gst = calculateGST({
      grossOrBaseAmount: baseRate,
      isInclusive: false,
      sacHsn: "996311",
      supplierStateCode: property.stateCode || "18",
    });

    nights.push({
      serviceDate,
      baseAmount: baseRate,
      discountAmount: 0,
      taxableAmount: gst.taxableAmount,
      taxAmount: gst.taxAmount,
      totalAmount: gst.totalAmount,
      ratePlanName: ratePlan?.name || "Best Available Rate",
    });

    subtotal += gst.taxableAmount;
    totalTax += gst.taxAmount;
    totalAmount += gst.totalAmount;
  }

  const availability = await calculateAvailability(req.propertyId, req.arrivalDate, req.departureDate);
  const rtAvail = availability.find((a) => a.roomTypeId === req.roomTypeId);

  return {
    roomTypeId: roomType.id,
    roomTypeName: roomType.name,
    ratePlanId: ratePlan?.id || "default",
    ratePlanName: ratePlan?.name || "BAR Room Only",
    nightsCount,
    nights,
    subtotal: Math.round(subtotal * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    availableRoomsCount: rtAvail?.availableCount ?? 1,
  };
}

export async function checkInGuest({
  propertyId,
  reservationId,
  guestData,
  roomId,
  arrivalAt,
  expectedDepartureAt,
  adults = 2,
  children = 0,
  paxM,
  paxF,
  paxC,
  ratePlanId,
  depositAmount = 0,
  actorId,
  overrideReason,
  coGuests,
  foreignDetails,
}: {
  propertyId: string;
  reservationId?: string;
  guestData: {
    name: string;
    phone?: string;
    email?: string;
    nationality?: string;
    address?: string;
    streetAddress?: string;
    policeStation?: string;
    city?: string;
    state?: string;
    pinZipCode?: string;
    country?: string;
    fatherSpouseName?: string;
    profession?: string;
    arrivedFrom?: string;
    goingTo?: string;
    purposeOfVisit?: string;
    driverName?: string;
    vehicleNumber?: string;
    gstin?: string;
    companyName?: string;
    idType?: string;
    idLast4?: string;
    age?: number;
    gender?: string;
  };
  roomId: string;
  arrivalAt?: Date;
  expectedDepartureAt: Date;
  adults?: number;
  children?: number;
  paxM?: number;
  paxF?: number;
  paxC?: number;
  ratePlanId?: string;
  depositAmount?: number;
  actorId?: string;
  overrideReason?: string;
  coGuests?: any[];
  foreignDetails?: any;
}) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  // Verify room exists and check cleanliness
  const room = await prisma.room.findUniqueOrThrow({
    where: { id: roomId },
    include: { roomState: true, roomType: true },
  });

  if (room.roomState?.occupancyStatus === "OCCUPIED") {
    throw new Error(`Room ${room.number} is already occupied.`);
  }

  if (room.roomState?.sellabilityStatus !== "SELLABLE" && !overrideReason) {
    throw new Error(`Room ${room.number} is ${room.roomState?.sellabilityStatus}. Override reason required.`);
  }

  // 1. Find or create Guest
  let guest: any;
  if (guestData.email || guestData.phone) {
    guest = await prisma.guest.findFirst({
      where: {
        organizationId: property.organizationId,
        OR: [
          ...(guestData.email ? [{ email: guestData.email }] : []),
          ...(guestData.phone ? [{ phone: guestData.phone }] : []),
        ],
      },
    });
  }

  const fullAddressJson = JSON.stringify({
    street: guestData.streetAddress || guestData.address || "",
    policeStation: guestData.policeStation || "",
    city: guestData.city || "",
    state: guestData.state || "",
    pinZipCode: guestData.pinZipCode || "",
    country: guestData.country || "India",
  });

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        organizationId: property.organizationId,
        name: guestData.name,
        phone: guestData.phone,
        email: guestData.email,
        nationality: guestData.nationality || "Indian",
        addressJson: fullAddressJson,
        gstin: guestData.gstin,
        companyName: guestData.companyName,
      },
    });
  } else {
    await prisma.guest.update({
      where: { id: guest.id },
      data: {
        name: guestData.name || guest.name,
        addressJson: fullAddressJson,
        gstin: guestData.gstin || guest.gstin,
        companyName: guestData.companyName || guest.companyName,
      },
    });
  }

  // Record guest document if provided
  if (guestData.idType && guestData.idLast4) {
    await prisma.guestDocument.create({
      data: {
        guestId: guest.id,
        propertyId,
        documentType: guestData.idType,
        last4: guestData.idLast4,
      },
    });
  }

  // 2. Reservation handling or walk-in reservation creation
  let resId = reservationId;
  if (!resId) {
    const seq = await getNextDocumentNumber(propertyId, "RESERVATION");
    const newRes = await prisma.reservation.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        confirmationNo: seq.formattedNumber,
        primaryGuestId: guest.id,
        arrivalDate: (arrivalAt || new Date()).toISOString().split("T")[0],
        departureDate: expectedDepartureAt.toISOString().split("T")[0],
        status: "CHECKED_IN",
        source: "WALK_IN",
      },
    });
    resId = newRes.id;
  } else {
    await prisma.reservation.update({
      where: { id: resId },
      data: { status: "CHECKED_IN" },
    });
  }

  // 3. Create Stay
  const stay = await prisma.stay.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      primaryGuestId: guest.id,
      status: "IN_HOUSE",
      arrivalAt: arrivalAt || new Date(),
      expectedDepartureAt,
      adults,
      children,
    },
  });

  // 4. Create Room Assignment
  await prisma.roomAssignment.create({
    data: {
      stayId: stay.id,
      roomId: room.id,
      startsAt: new Date(),
      rateHandling: "RETAIN_RATE",
    },
  });

  // 5. Update Room State to OCCUPIED
  await prisma.roomState.upsert({
    where: { roomId: room.id },
    create: {
      organizationId: property.organizationId,
      propertyId,
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

  // 6. Create Primary Folio and Guest Window
  const folio = await prisma.folio.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      stayId: stay.id,
      status: "OPEN",
      currency: property.currency,
      balance: 0,
    },
  });

  const guestWindow = await prisma.folioWindow.create({
    data: {
      folioId: folio.id,
      name: "Guest Window",
      windowNumber: 1,
      payerType: "GUEST",
      guestOrCompanySnapshot: JSON.stringify({
        name: guest.name,
        phone: guest.phone,
        gstin: guest.gstin,
      }),
      status: "OPEN",
    },
  });

  // Update stay with folio ID
  await prisma.stay.update({
    where: { id: stay.id },
    data: { folioId: folio.id },
  });

  // 7. Post Initial Room Tariff Charge (SAC 996311)
  let roomBasePrice = 3200;
  if (room.roomTypeId) {
    const rateVersion = await prisma.ratePlanVersion.findFirst({
      where: { roomTypeId: room.roomTypeId, active: true },
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
    supplierStateCode: property.stateCode || "18",
  });

  const serviceDateStr = property.businessDate || new Date().toISOString().split("T")[0];

  await prisma.folioEntry.create({
    data: {
      organizationId: property.organizationId,
      propertyId: property.id,
      folioId: folio.id,
      folioWindowId: guestWindow.id,
      serviceDate: serviceDateStr,
      type: "CHARGE",
      chargeCode: "ROOM_TARIFF",
      description: `Room Tariff - Room ${room.number} (${room.roomType?.name || "Room Charge"})`,
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

  // 8. Handle advance deposit if provided
  if (depositAmount > 0) {
    const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT");
    const payment = await prisma.payment.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        receiptNo: recSeq.formattedNumber,
        folioId: folio.id,
        amount: depositAmount,
        method: "CASH",
        status: "SUCCEEDED",
        createdById: actorId,
      },
    });

    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        folioWindowId: guestWindow.id,
        amount: depositAmount,
      },
    });

    currentBalance -= depositAmount;
  }

  await prisma.folio.update({
    where: { id: folio.id },
    data: { balance: currentBalance },
  });

  // 9. Generate GRC Registration Record
  const grcSeq = await getNextDocumentNumber(propertyId, "GRC");
  const formattedArrival = (arrivalAt || new Date()).toISOString().replace("T", " ").slice(0, 16);

  const registration = await prisma.guestRegistration.create({
    data: {
      organizationId: property.organizationId,
      propertyId: property.id,
      registrationNo: grcSeq.formattedNumber,
      status: "CHECKED_IN",
      fullName: guestData.name,
      age: guestData.age ? Number(guestData.age) : undefined,
      gender: guestData.gender || "Male",
      nationality: guestData.nationality || "Indian",
      fatherSpouseName: guestData.fatherSpouseName || "",
      arrivalDateTime: formattedArrival,
      expectedDepartureDate: expectedDepartureAt.toISOString().split("T")[0],
      preAssignedRoom: room.number,
      streetAddress: guestData.streetAddress || guestData.address || "",
      city: guestData.city || "",
      state: guestData.state || "",
      pinZipCode: guestData.pinZipCode || "",
      country: guestData.country || "India",
      arrivedFrom: guestData.arrivedFrom || "",
      goingTo: guestData.goingTo || "",
      purposeOfVisit: guestData.purposeOfVisit || "Tourism / Holiday",
      referralChannel: "Direct / Walk-In",
      mobilePhone: guestData.phone || "",
      alternatePhone: guestData.phone || "",
      email: guestData.email || "",
      driverName: guestData.driverName || "",
      vehicleNumber: guestData.vehicleNumber || "",
      coGuestsJson: coGuests ? JSON.stringify(coGuests) : null,
      idDocumentType: guestData.idType || "AADHAAR",
      idDocumentNumber: guestData.idLast4 || "",
      foreignPassportDetailsJson: foreignDetails ? JSON.stringify(foreignDetails) : null,
      assignedRoomId: room.id,
      assignedRoomNumber: room.number,
      stayId: stay.id,
      guestId: guest.id,
      depositAmount: depositAmount,
      processedByUserId: actorId,
    },
  });

  // 10. Write Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      actorId,
      actorName: "Staff",
      action: "CHECK_IN",
      targetType: "STAY",
      targetId: stay.id,
      afterJson: JSON.stringify({
        roomNumber: room.number,
        grcNo: grcSeq.formattedNumber,
        guestName: guest.name,
        depositAmount,
      }),
    },
  });

  return { stay, guest, folio, registration, room };
}

export async function moveRoom({
  stayId,
  targetRoomId,
  reason,
  rateHandling = "RETAIN_RATE",
  actorId,
}: {
  stayId: string;
  targetRoomId: string;
  reason: string;
  rateHandling?: string;
  actorId?: string;
}) {
  const stay = await prisma.stay.findUniqueOrThrow({
    where: { id: stayId },
    include: {
      roomAssignments: { where: { endsAt: null } },
      property: true,
    },
  });

  const targetRoom = await prisma.room.findUniqueOrThrow({
    where: { id: targetRoomId },
    include: { roomState: true },
  });

  if (targetRoom.roomState?.occupancyStatus === "OCCUPIED") {
    throw new Error(`Target room ${targetRoom.number} is occupied.`);
  }

  const currentAssignment = stay.roomAssignments[0];
  const oldRoomId = currentAssignment?.roomId;

  // 1. Close current room assignment
  if (currentAssignment) {
    await prisma.roomAssignment.update({
      where: { id: currentAssignment.id },
      data: {
        endsAt: new Date(),
        moveReason: reason,
      },
    });
  }

  // 2. Open new room assignment
  await prisma.roomAssignment.create({
    data: {
      stayId,
      roomId: targetRoomId,
      startsAt: new Date(),
      rateHandling,
      moveReason: reason,
    },
  });

  // 3. Mark old room as VACANT + DIRTY and create Checkout Clean Task
  if (oldRoomId) {
    await prisma.roomState.upsert({
      where: { roomId: oldRoomId },
      create: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        roomId: oldRoomId,
        occupancyStatus: "VACANT",
        housekeepingStatus: "DIRTY",
        sellabilityStatus: "SELLABLE",
      },
      update: {
        occupancyStatus: "VACANT",
        housekeepingStatus: "DIRTY",
        lastChangedAt: new Date(),
      },
    });

    await prisma.housekeepingTask.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        roomId: oldRoomId,
        stayId: stay.id,
        type: "CHECKOUT_CLEAN",
        priority: "HIGH",
        status: "OPEN",
        notes: `Auto-generated after room move to ${targetRoom.number}. Reason: ${reason}`,
      },
    });
  }

  // 4. Mark target room as OCCUPIED
  await prisma.roomState.upsert({
    where: { roomId: targetRoomId },
    create: {
      organizationId: stay.organizationId,
      propertyId: stay.propertyId,
      roomId: targetRoomId,
      occupancyStatus: "OCCUPIED",
      housekeepingStatus: targetRoom.roomState?.housekeepingStatus || "CLEAN",
      sellabilityStatus: "SELLABLE",
    },
    update: {
      occupancyStatus: "OCCUPIED",
      lastChangedAt: new Date(),
    },
  });

  // 5. Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: stay.organizationId,
      propertyId: stay.propertyId,
      actorId,
      action: "ROOM_MOVE",
      targetType: "STAY",
      targetId: stay.id,
      reason,
      afterJson: JSON.stringify({
        fromRoomId: oldRoomId,
        toRoomId: targetRoomId,
        targetRoomNumber: targetRoom.number,
      }),
    },
  });

  return { success: true, newRoomNumber: targetRoom.number };
}
