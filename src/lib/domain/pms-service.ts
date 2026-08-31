import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";
import { normalizeGuestName } from "./name-utils";

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

export function getLocalHourMinute(date: Date | string): { hour: number; minute: number } {
  const d = new Date(date);
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const minutePart = parts.find((p) => p.type === "minute")?.value;
    return {
      hour: hourPart ? parseInt(hourPart, 10) : d.getHours(),
      minute: minutePart ? parseInt(minutePart, 10) : d.getMinutes(),
    };
  } catch {
    return { hour: d.getHours(), minute: d.getMinutes() };
  }
}

export function calculate24HrBillableDays(
  arrivalAt: Date | string,
  departureAt: Date | string,
  checkoutType: "24_HOURS" | "FIXED_TIME" = "24_HOURS",
  gracePeriodMinutes: number = 60
): {
  billableDays: number;
  hoursElapsed: number;
  gracePeriodApplied: boolean;
  isEarlyBird: boolean;
  checkoutDeadlineText: string;
} {
  const start = new Date(arrivalAt).getTime();
  const end = new Date(departureAt).getTime();
  const elapsedMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));
  const hoursElapsed = Math.round((elapsedMinutes / 60) * 10) / 10;

  // Check if check-in qualifies for Early Bird Offer (5:00 AM to 11:00 AM check-in)
  const { hour: arrHour } = getLocalHourMinute(arrivalAt);
  const isEarlyBird = arrHour >= 5 && arrHour < 11;

  // Manager Waive Next Night (1440 mins = 24h waive)
  if (gracePeriodMinutes >= 1440) {
    return {
      billableDays: 1,
      hoursElapsed,
      gracePeriodApplied: true,
      isEarlyBird,
      checkoutDeadlineText: isEarlyBird ? "Standard 12:00 PM (Next Night Waived)" : "24-Hr Cycle (Next Night Waived)",
    };
  }

  // EARLY BIRD OFFER (5 AM - 11 AM):
  // Check-in between 5 AM and 11 AM gets no extra early charge.
  // Base stay validity extends until Standard Check-Out at 12:00 PM (Noon) next day.
  if (isEarlyBird) {
    const arrDate = new Date(arrivalAt);
    // Base 12:00 PM Noon checkout on the next calendar day
    const nextDayNoon = new Date(arrDate);
    nextDayNoon.setDate(nextDayNoon.getDate() + 1);
    nextDayNoon.setHours(12, 0, 0, 0);

    const deadlineMs = nextDayNoon.getTime();
    const graceMs = gracePeriodMinutes * 60 * 1000;
    const deadlineWithGraceMs = deadlineMs + graceMs;

    if (end <= deadlineWithGraceMs) {
      const graceApplied = end > deadlineMs && end <= deadlineWithGraceMs;
      return {
        billableDays: 1,
        hoursElapsed,
        gracePeriodApplied: graceApplied,
        isEarlyBird: true,
        checkoutDeadlineText: "Standard 12:00 PM Check-Out (Early Bird Offer)",
      };
    } else {
      // Past 12:00 PM + Grace Period -> bill for next day (+1 night per 24h cycle beyond noon)
      const overtimeMinutes = Math.max(1, Math.round((end - deadlineMs) / (1000 * 60)));
      const extraNights = Math.max(1, Math.ceil(overtimeMinutes / (24 * 60)));
      return {
        billableDays: 1 + extraNights,
        hoursElapsed,
        gracePeriodApplied: false,
        isEarlyBird: true,
        checkoutDeadlineText: "Standard 12:00 PM (Overtime Billed)",
      };
    }
  }

  if (checkoutType === "FIXED_TIME") {
    const startDate = new Date(arrivalAt).toISOString().split("T")[0];
    const endDate = new Date(departureAt).toISOString().split("T")[0];
    const diffDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
    return {
      billableDays: diffDays,
      hoursElapsed,
      gracePeriodApplied: false,
      isEarlyBird: false,
      checkoutDeadlineText: "Standard 12:00 PM Check-Out",
    };
  }

  // STANDARD 24_HOURS CYCLE:
  const completedBlocks = Math.floor(elapsedMinutes / (24 * 60));
  const remainderMinutes = elapsedMinutes % (24 * 60);

  if (completedBlocks === 0) {
    return {
      billableDays: 1,
      hoursElapsed,
      gracePeriodApplied: false,
      isEarlyBird: false,
      checkoutDeadlineText: "24-Hr Cycle Billing",
    };
  }

  // Past 24 hours: check grace period
  if (remainderMinutes <= gracePeriodMinutes) {
    return {
      billableDays: completedBlocks,
      hoursElapsed,
      gracePeriodApplied: true,
      isEarlyBird: false,
      checkoutDeadlineText: `24-Hr Cycle (${gracePeriodMinutes}m Grace Active)`,
    };
  } else {
    return {
      billableDays: completedBlocks + 1,
      hoursElapsed,
      gracePeriodApplied: false,
      isEarlyBird: false,
      checkoutDeadlineText: "24-Hr Cycle (Rollover Billed)",
    };
  }
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
  roomIds,
  groupBilling = true,
  roomRates,
  arrivalAt,
  expectedDepartureAt,
  adults = 2,
  children = 0,
  paxM,
  paxF,
  paxC,
  ratePlanId,
  depositAmount = 0,
  depositMethod = "CASH",
  depositRef,
  agreedTariff,
  isComplimentary = false,
  isRateInclusive = true,
  checkoutType = "24_HOURS",
  gracePeriodMinutes = 60,
  extraBeds = 0,
  extraBedRate = 500,
  actorId,
  overrideReason,
  coGuests,
  foreignDetails,
}: {
  propertyId: string;
  reservationId?: string;
  guestData: {
    name: string;
    title?: string;
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
    referralChannel?: string;
  };
  roomIds: string[];
  groupBilling?: boolean;
  roomRates?: Record<string, number | string>;
  arrivalAt?: Date;
  expectedDepartureAt: Date;
  adults?: number;
  children?: number;
  paxM?: number;
  paxF?: number;
  paxC?: number;
  ratePlanId?: string;
  depositAmount?: number;
  depositMethod?: string;
  depositRef?: string;
  agreedTariff?: number;
  isComplimentary?: boolean;
  isRateInclusive?: boolean;
  checkoutType?: "24_HOURS" | "FIXED_TIME";
  gracePeriodMinutes?: number;
  extraBeds?: number;
  extraBedRate?: number;
  actorId?: string;
  overrideReason?: string;
  coGuests?: any[];
  foreignDetails?: any;
}) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  // Verify rooms exist and check cleanliness
  const rooms = await prisma.room.findMany({
    where: { id: { in: roomIds } },
    include: { roomState: true, roomType: true },
  });

  if (rooms.length !== roomIds.length) {
    throw new Error("One or more rooms not found.");
  }

  for (const room of rooms) {
    if (room.roomState?.occupancyStatus === "OCCUPIED") {
      throw new Error(`Room ${room.number} is already occupied.`);
    }

    if (room.roomState?.sellabilityStatus !== "SELLABLE" && !overrideReason) {
      throw new Error(`Room ${room.number} is ${room.roomState?.sellabilityStatus}. Override reason required.`);
    }
  }

  const { pureName: canonicalGuestName } = normalizeGuestName(guestData.name, guestData.title);

  // 1. Find or create Guest (matching by name and phone/email to prevent overwriting different family members/group members)
  let guest: any = null;
  if (canonicalGuestName) {
    guest = await prisma.guest.findFirst({
      where: {
        organizationId: property.organizationId,
        name: canonicalGuestName,
        ...(guestData.phone || guestData.email
          ? {
              OR: [
                ...(guestData.phone ? [{ phone: guestData.phone }] : []),
                ...(guestData.email ? [{ email: guestData.email }] : []),
              ],
            }
          : {}),
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
        name: canonicalGuestName,
        phone: guestData.phone,
        email: guestData.email,
        nationality: guestData.nationality || "Indian",
        addressJson: fullAddressJson,
        gstin: guestData.gstin,
        companyName: guestData.companyName,
      },
    });
  } else {
    // Safely update details on the same guest profile without modifying other guests
    await prisma.guest.update({
      where: { id: guest.id },
      data: {
        addressJson: fullAddressJson,
        phone: guestData.phone || guest.phone,
        email: guestData.email || guest.email,
        gstin: guestData.gstin !== undefined ? (guestData.gstin || null) : guest.gstin,
        companyName: guestData.companyName !== undefined ? (guestData.companyName || null) : guest.companyName,
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

  const start = new Date((arrivalAt || new Date()).toISOString().split("T")[0]);
  const end = new Date(expectedDepartureAt.toISOString().split("T")[0]);
  const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const serviceDateStr = property.businessDate || new Date().toISOString().split("T")[0];

  let totalBalanceAdded = 0;
  let stayIdsForDeposit: string[] = [];
  let masterFolioId: string | null = null;
  let guestWindowForDeposit: any = null;

  if (groupBilling) {
    // SINGLE STAY & SINGLE FOLIO FOR ALL ROOMS
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
    stayIdsForDeposit.push(stay.id);

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
    masterFolioId = folio.id;

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
    guestWindowForDeposit = guestWindow;

    await prisma.stay.update({
      where: { id: stay.id },
      data: { folioId: folio.id },
    });

    const primaryRoomId = roomIds[0];

    for (const room of rooms) {
      const isPrimaryRoom = room.id === primaryRoomId;
      let roomBasePrice = 3200;
      let isComp = false;

      // 1. Check if room has an explicit custom rate in roomRates (by room ID or room number)
      const hasCustomRate =
        roomRates &&
        ((roomRates[room.id] !== undefined && roomRates[room.id] !== "") ||
          (room.number && roomRates[room.number] !== undefined && roomRates[room.number] !== ""));

      if (hasCustomRate) {
        const rawVal =
          roomRates[room.id] !== undefined && roomRates[room.id] !== ""
            ? roomRates[room.id]
            : roomRates[room.number];
        const numVal = Number(rawVal);
        if (rawVal === "COMP" || rawVal === "0" || numVal === 0) {
          isComp = true;
          roomBasePrice = 0;
        } else {
          isComp = false;
          roomBasePrice = isNaN(numVal) ? 3200 : numVal;
        }
      } else if (isPrimaryRoom) {
        // Primary room inherits top-level isComplimentary or agreedTariff
        isComp = Boolean(isComplimentary || agreedTariff === 0);
        if (isComp) {
          roomBasePrice = 0;
        } else if (agreedTariff !== undefined && agreedTariff !== null) {
          roomBasePrice = Number(agreedTariff);
          isComp = roomBasePrice === 0;
        } else if (room.roomTypeId) {
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
      } else {
        // Additional room without custom entry in roomRates: use room category base price
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
        } else if (agreedTariff !== undefined && agreedTariff !== null && Number(agreedTariff) > 0 && !isComplimentary) {
          roomBasePrice = Number(agreedTariff);
        }
      }

      await prisma.roomAssignment.create({
        data: {
          stayId: stay.id,
          roomId: room.id,
          startsAt: new Date(),
          moveReason: isComp ? "AGREED_RATE:0" : `AGREED_RATE:${roomBasePrice}:${isRateInclusive !== false ? "INC" : "EXC"}`,
          rateHandling: isComp ? "COMPLIMENTARY" : (checkoutType === "FIXED_TIME" ? "FIXED_TIME" : `24_HOURS:${gracePeriodMinutes}`),
        },
      });

      await prisma.roomState.upsert({
        where: { roomId: room.id },
        create: {
          organizationId: property.organizationId, propertyId, roomId: room.id, occupancyStatus: "OCCUPIED",
          housekeepingStatus: room.roomState?.housekeepingStatus || "CLEAN", sellabilityStatus: "SELLABLE",
        },
        update: { occupancyStatus: "OCCUPIED", lastChangedAt: new Date() },
      });

      const initialNightPrice = roomBasePrice * 1;
      const roomGst = isComp
        ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
        : calculateGST({
            grossOrBaseAmount: initialNightPrice, isInclusive: isRateInclusive !== false, sacHsn: "996311",
            supplierStateCode: property.stateCode || "18", customTaxRate: 5,
          });

      await prisma.folioEntry.create({
        data: {
          organizationId: property.organizationId, propertyId, folioId: folio.id, folioWindowId: guestWindow.id,
          serviceDate: serviceDateStr, type: "CHARGE", chargeCode: "ROOM_TARIFF",
          description: isComp
            ? `Room Tariff - Room ${room.number} (Night 1 - COMPLIMENTARY)`
            : `Room Tariff - Room ${room.number} (Night 1)`,
          qty: 1, unitAmount: roomBasePrice, taxableAmount: roomGst.taxableAmount,
          taxComponentsJson: JSON.stringify(roomGst.components), totalAmount: roomGst.totalAmount,
          sourceType: "PMS_NIGHTLY_CHARGE", status: "POSTED",
        },
      });

      totalBalanceAdded += roomGst.totalAmount;
    }

    // Post Extra Bed Charges for Night 1 if requested (SAC 996311, 5% Flat GST Inclusive)
    if (extraBeds > 0) {
      const initialExtraBedGross = extraBeds * extraBedRate * 1;
      const extraBedGst = calculateGST({
        grossOrBaseAmount: initialExtraBedGross,
        isInclusive: true,
        sacHsn: "996311",
        supplierStateCode: property.stateCode || "18",
        customTaxRate: 5,
      });

      await prisma.folioEntry.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          folioId: folio.id,
          folioWindowId: guestWindow.id,
          serviceDate: serviceDateStr,
          type: "CHARGE",
          chargeCode: "EXTRA_PAX",
          description: `Extra Pax (${extraBeds} Pax x ₹${extraBedRate}/night - Night 1)`,
          qty: extraBeds,
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

    await prisma.folio.update({
      where: { id: folio.id },
      data: { balance: totalBalanceAdded },
    });
  } else {
    // SEPARATE STAYS & FOLIOS FOR EACH ROOM
    const primaryRoomId = roomIds[0];

    for (const room of rooms) {
      const isPrimaryRoom = room.id === primaryRoomId;
      const stay = await prisma.stay.create({
        data: {
          organizationId: property.organizationId, propertyId, primaryGuestId: guest.id,
          status: "IN_HOUSE", arrivalAt: arrivalAt || new Date(), expectedDepartureAt,
          adults: Math.max(1, Math.floor(adults / rooms.length)), children: 0,
        },
      });
      stayIdsForDeposit.push(stay.id);

      let roomBasePrice = 3200;
      let isComp = false;

      // 1. Check if room has an explicit custom rate in roomRates (by room ID or room number)
      const hasCustomRate =
        roomRates &&
        ((roomRates[room.id] !== undefined && roomRates[room.id] !== "") ||
          (room.number && roomRates[room.number] !== undefined && roomRates[room.number] !== ""));

      if (hasCustomRate) {
        const rawVal =
          roomRates[room.id] !== undefined && roomRates[room.id] !== ""
            ? roomRates[room.id]
            : roomRates[room.number];
        const numVal = Number(rawVal);
        if (rawVal === "COMP" || rawVal === "0" || numVal === 0) {
          isComp = true;
          roomBasePrice = 0;
        } else {
          isComp = false;
          roomBasePrice = isNaN(numVal) ? 3200 : numVal;
        }
      } else if (isPrimaryRoom) {
        // Primary room inherits top-level isComplimentary or agreedTariff
        isComp = Boolean(isComplimentary || agreedTariff === 0);
        if (isComp) {
          roomBasePrice = 0;
        } else if (agreedTariff !== undefined && agreedTariff !== null) {
          roomBasePrice = Number(agreedTariff);
          isComp = roomBasePrice === 0;
        } else if (room.roomTypeId) {
          const rateVersion = await prisma.ratePlanVersion.findFirst({
            where: { roomTypeId: room.roomTypeId, active: true }, orderBy: { createdAt: "desc" },
          });
          if (rateVersion?.pricingJson) {
            try {
              const pricing = JSON.parse(rateVersion.pricingJson);
              if (pricing.basePrice) roomBasePrice = Number(pricing.basePrice);
            } catch {}
          }
        }
      } else {
        // Additional room without custom entry in roomRates: use room category base price
        if (room.roomTypeId) {
          const rateVersion = await prisma.ratePlanVersion.findFirst({
            where: { roomTypeId: room.roomTypeId, active: true }, orderBy: { createdAt: "desc" },
          });
          if (rateVersion?.pricingJson) {
            try {
              const pricing = JSON.parse(rateVersion.pricingJson);
              if (pricing.basePrice) roomBasePrice = Number(pricing.basePrice);
            } catch {}
          }
        } else if (agreedTariff !== undefined && agreedTariff !== null && Number(agreedTariff) > 0 && !isComplimentary) {
          roomBasePrice = Number(agreedTariff);
        }
      }

      await prisma.roomAssignment.create({
        data: {
          stayId: stay.id,
          roomId: room.id,
          startsAt: new Date(),
          moveReason: isComp ? "AGREED_RATE:0" : `AGREED_RATE:${roomBasePrice}`,
          rateHandling: isComp ? "COMPLIMENTARY" : (checkoutType === "FIXED_TIME" ? "FIXED_TIME" : `24_HOURS:${gracePeriodMinutes}`),
        },
      });

      await prisma.roomState.upsert({
        where: { roomId: room.id },
        create: {
          organizationId: property.organizationId, propertyId, roomId: room.id, occupancyStatus: "OCCUPIED",
          housekeepingStatus: room.roomState?.housekeepingStatus || "CLEAN", sellabilityStatus: "SELLABLE",
        },
        update: { occupancyStatus: "OCCUPIED", lastChangedAt: new Date() },
      });

      const folio = await prisma.folio.create({
        data: { organizationId: property.organizationId, propertyId, stayId: stay.id, status: "OPEN", currency: property.currency, balance: 0 },
      });
      if (!masterFolioId) {
        masterFolioId = folio.id;
      }

      const guestWindow = await prisma.folioWindow.create({
        data: {
          folioId: folio.id, name: "Guest Window", windowNumber: 1, payerType: "GUEST",
          guestOrCompanySnapshot: JSON.stringify({ name: guest.name, phone: guest.phone, gstin: guest.gstin }), status: "OPEN",
        },
      });
      if (!guestWindowForDeposit) {
        guestWindowForDeposit = guestWindow;
      }

      await prisma.stay.update({ where: { id: stay.id }, data: { folioId: folio.id } });

      const initialNightPrice = roomBasePrice * 1;
      const roomGst = isComp
        ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
        : calculateGST({
            grossOrBaseAmount: initialNightPrice, isInclusive: true, sacHsn: "996311",
            supplierStateCode: property.stateCode || "18", customTaxRate: 5,
          });

      await prisma.folioEntry.create({
        data: {
          organizationId: property.organizationId, propertyId, folioId: folio.id, folioWindowId: guestWindow.id,
          serviceDate: serviceDateStr, type: "CHARGE", chargeCode: "ROOM_TARIFF",
          description: isComp
            ? `Room Tariff - Room ${room.number} (Night 1 - COMPLIMENTARY)`
            : `Room Tariff - Room ${room.number} (Night 1)`,
          qty: 1, unitAmount: roomBasePrice, taxableAmount: roomGst.taxableAmount,
          taxComponentsJson: JSON.stringify(roomGst.components), totalAmount: roomGst.totalAmount,
          sourceType: "PMS_NIGHTLY_CHARGE", status: "POSTED",
        },
      });

      await prisma.folio.update({
        where: { id: folio.id },
        data: { balance: roomGst.totalAmount },
      });
      totalBalanceAdded += roomGst.totalAmount;
    }
  }

  // 8. Handle advance deposit if provided
  if (depositAmount > 0) {
    const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT");
    const isBTC = depositMethod === "DIRECT_BILL";
    const payment = await prisma.payment.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        receiptNo: recSeq.formattedNumber,
        folioId: masterFolioId!,
        amount: depositAmount,
        method: depositMethod || "CASH",
        reference: depositRef || (isBTC ? `BTC-${guestData.companyName || "CORP"}` : undefined),
        payerSnapshot: JSON.stringify({
          name: guestData.name,
          phone: guestData.phone,
          companyName: guestData.companyName || "",
          gstin: guestData.gstin || "",
          billToCompany: isBTC,
        }),
        status: "SUCCEEDED",
        createdById: actorId,
      },
    });

    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        folioWindowId: guestWindowForDeposit.id,
        amount: depositAmount,
      },
    });

    await prisma.folio.update({
      where: { id: masterFolioId! },
      data: { balance: { decrement: depositAmount } },
    });
  }

  // 9. Generate GRC Registration Record
  const grcSeq = await getNextDocumentNumber(propertyId, "GRC");
  const formattedArrival = (arrivalAt || new Date()).toISOString().replace("T", " ").slice(0, 16);

  const registration = await prisma.guestRegistration.create({
    data: {
      organizationId: property.organizationId,
      propertyId: property.id,
      registrationNo: grcSeq.formattedNumber,
      status: "CHECKED_IN",
      fullName: (guestData as any).fullName || guestData.name || guest.name,
      age: guestData.age ? Number(guestData.age) : undefined,
      gender: guestData.gender || "Male",
      nationality: guestData.nationality || "Indian",
      fatherSpouseName: guestData.fatherSpouseName || "",
      arrivalDateTime: formattedArrival,
      expectedDepartureDate: expectedDepartureAt.toISOString().split("T")[0],
      preAssignedRoom: rooms.map(r => r.number).join(", "),
      streetAddress: guestData.streetAddress || guestData.address || "",
      city: guestData.city || "",
      state: guestData.state || "",
      pinZipCode: guestData.pinZipCode || "",
      country: guestData.country || "India",
      arrivedFrom: guestData.arrivedFrom || "",
      goingTo: guestData.goingTo || "",
      purposeOfVisit: guestData.purposeOfVisit || "Tourism / Holiday",
      referralChannel: guestData.referralChannel || (guestData.companyName ? `Corporate (${guestData.companyName})` : "Direct / Walk-In"),
      mobilePhone: (guestData as any).mobilePhone || guestData.phone || guest.phone,
      alternatePhone: (guestData as any).alternatePhone || guestData.phone || "",
      email: guestData.email || guest.email || "",
      driverName: guestData.driverName || "",
      vehicleNumber: guestData.vehicleNumber || "",
      coGuestsJson: coGuests ? JSON.stringify(coGuests) : null,
      idDocumentType: guestData.idType || "AADHAAR",
      idDocumentNumber: guestData.idLast4 || "",
      foreignPassportDetailsJson: foreignDetails ? JSON.stringify(foreignDetails) : null,
      assignedRoomId: rooms[0].id,
      assignedRoomNumber: rooms.map((r) => r.number).join(", "),
      stayId: stayIdsForDeposit[0],
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
      targetId: stayIdsForDeposit[0],
      afterJson: JSON.stringify({
        roomNumbers: rooms.map((r) => r.number).join(", "),
        grcNo: grcSeq.formattedNumber,
        guestName: guest.name,
        depositAmount,
      }),
    },
  });

  return { success: true, stayIds: stayIdsForDeposit, guest, masterFolioId, registration };
}

export async function moveRoom({
  stayId,
  fromRoomId,
  targetRoomId,
  reason,
  rateHandling = "RETAIN_RATE",
  customRate,
  actorId,
}: {
  stayId: string;
  fromRoomId?: string;
  targetRoomId: string;
  reason: string;
  rateHandling?: string;
  customRate?: number;
  actorId?: string;
}) {
  const stay = await prisma.stay.findUniqueOrThrow({
    where: { id: stayId },
    include: {
      roomAssignments: { where: { endsAt: null }, include: { room: true } },
      primaryGuest: true,
      property: true,
      folio: {
        include: {
          windows: { include: { entries: true } },
        },
      },
    },
  });

  const targetRoom = await prisma.room.findUniqueOrThrow({
    where: { id: targetRoomId },
    include: { roomState: true, roomType: true },
  });

  if (targetRoom.roomState?.occupancyStatus === "OCCUPIED") {
    throw new Error(`Target room ${targetRoom.number} is currently occupied.`);
  }

  // Identify which specific room assignment is being moved
  const currentAssignment = fromRoomId
    ? stay.roomAssignments.find((ra) => ra.roomId === fromRoomId || ra.room?.id === fromRoomId || ra.room?.number === fromRoomId)
    : stay.roomAssignments[0];

  if (!currentAssignment) {
    throw new Error("No active room assignment found for this stay to move.");
  }

  const oldRoomId = currentAssignment.roomId;
  const oldRoomNumber = currentAssignment.room?.number;

  // Determine rate handling and moveReason for the new room assignment
  let newRateHandling = "RETAIN_RATE";
  let newMoveReason = "AGREED_RATE:3200";

  if (rateHandling === "COMPLIMENTARY" || customRate === 0) {
    newRateHandling = "COMPLIMENTARY";
    newMoveReason = "AGREED_RATE:0";
  } else if (customRate !== undefined && customRate > 0) {
    newRateHandling = "RETAIN_RATE";
    newMoveReason = `AGREED_RATE:${customRate}`;
  } else if (rateHandling === "USE_TARGET_BASE") {
    const targetBase = 3200;
    newRateHandling = "RETAIN_RATE";
    newMoveReason = `AGREED_RATE:${targetBase}`;
  } else {
    // Inherit existing rate from previous assignment
    newRateHandling = currentAssignment.rateHandling || "RETAIN_RATE";
    if (currentAssignment.moveReason?.startsWith("AGREED_RATE:")) {
      newMoveReason = currentAssignment.moveReason;
    } else if (currentAssignment.rateHandling === "COMPLIMENTARY") {
      newMoveReason = "AGREED_RATE:0";
    } else {
      newMoveReason = "AGREED_RATE:3200";
    }
  }

  // 1. Close current room assignment
  await prisma.roomAssignment.update({
    where: { id: currentAssignment.id },
    data: {
      endsAt: new Date(),
      moveReason: `${reason} (Moved to Room ${targetRoom.number})`,
    },
  });

  // 2. Open new room assignment
  await prisma.roomAssignment.create({
    data: {
      stayId,
      roomId: targetRoomId,
      startsAt: new Date(),
      rateHandling: newRateHandling,
      moveReason: newMoveReason,
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
        notes: `Auto-generated after room move from Room ${oldRoomNumber || oldRoomId} to Room ${targetRoom.number}. Reason: ${reason}`,
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

  // 5. Synchronize GRC Record if exists
  if (stay.primaryGuest) {
    try {
      const grc = await prisma.guestRegistration.findFirst({
        where: {
          OR: [
            ...(stay.primaryGuest.phone ? [{ mobilePhone: stay.primaryGuest.phone }] : []),
            ...(stay.primaryGuest.name ? [{ fullName: stay.primaryGuest.name }] : []),
          ],
        },
      });

      if (grc) {
        let updatedNotes = grc.internalNotes;
        let updatedPreAssigned = grc.preAssignedRoom;

        if (oldRoomNumber && grc.preAssignedRoom === oldRoomNumber) {
          updatedPreAssigned = targetRoom.number;
        }

        if (grc.internalNotes) {
          try {
            const parsed = JSON.parse(grc.internalNotes);
            if (Array.isArray(parsed.additionalRoomIds) && oldRoomNumber) {
              parsed.additionalRoomIds = parsed.additionalRoomIds.map((rid: string) =>
                rid === oldRoomNumber || rid === oldRoomId ? targetRoom.number : rid
              );
            }
            if (parsed.roomRates && oldRoomNumber && parsed.roomRates[oldRoomNumber] !== undefined) {
              const oldVal = parsed.roomRates[oldRoomNumber];
              delete parsed.roomRates[oldRoomNumber];
              parsed.roomRates[targetRoom.number] = oldVal;
            }
            updatedNotes = JSON.stringify(parsed);
          } catch {}
        }

        await prisma.guestRegistration.update({
          where: { id: grc.id },
          data: {
            preAssignedRoom: updatedPreAssigned,
            internalNotes: updatedNotes,
          },
        });
      }
    } catch (grcErr) {
      console.warn("GRC sync warning during moveRoom:", grcErr);
    }
  }

  // 6. Audit Log
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
        fromRoomNumber: oldRoomNumber,
        toRoomId: targetRoomId,
        targetRoomNumber: targetRoom.number,
        rateHandling: newRateHandling,
        moveReason: newMoveReason,
      }),
    },
  });

  return {
    success: true,
    stayId: stay.id,
    oldRoomNumber,
    newRoomNumber: targetRoom.number,
  };
}

