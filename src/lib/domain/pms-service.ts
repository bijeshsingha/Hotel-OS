import type { Prisma } from "@prisma/client";
import { carryReservationAdvance } from "./reservation-advance-service";
import { additionalCheckinCollection } from "./reservation-advance";
import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";
import { normalizeGuestName } from "./name-utils";
import { sync24HourFolioCharges } from "./folio-service";
import {
  validateStayInterval,
  toServiceDate,
  intervalsOverlap,
  DateValidationError,
} from "./booking-dates";

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

export {
  getLocalHourMinute,
  calculate24HrBillableDays,
  calculateDynamicDepartureDate,
  getEffectiveStayDeparture,
} from "./stay-calculator";



export interface RoomTypeAvailability {
  roomTypeId: string;
  roomTypeCode: string;
  roomTypeName: string;
  totalRooms: number;
  occupiedOrBlocked: number;
  availableCount: number;
  capacity: number;
}

export async function calculateAvailability(
  propertyId: string,
  arrivalDate: string,
  departureDate: string,
  db: any = prisma
): Promise<RoomTypeAvailability[]> {
  const { serviceDates } = validateStayInterval(arrivalDate, departureDate);

  const property = await db.property.findUniqueOrThrow({ where: { id: propertyId }, select: { timezone: true } });
  const inventoryDate = (timestamp: Date | string) => toServiceDate(timestamp, property.timezone);

  const rooms = await db.room.findMany({
    where: { propertyId, active: true },
    select: {
      id: true,
      roomTypeId: true,
      number: true,
    },
  });

  const roomTypes = await db.roomType.findMany({
    where: { propertyId, active: true },
  });

  if (!roomTypes.length) return [];

  const blocks = await db.roomBlock.findMany({
    where: {
      propertyId,
      status: "ACTIVE",
    },
    select: {
      roomId: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const stays = await db.stay.findMany({
    where: {
      propertyId,
      status: { in: ["IN_HOUSE", "DUE_IN"] },
    },
    select: {
      id: true,
      arrivalAt: true,
      expectedDepartureAt: true,
      reservationRoomId: true,
      roomAssignments: {
        select: {
          roomId: true,
          startsAt: true,
          endsAt: true,
          room: { select: { roomTypeId: true } },
        },
      },
      reservationRoom: {
        select: { id: true, roomTypeId: true },
      },
    },
  });

  const reservations = await db.reservation.findMany({
    where: {
      propertyId,
      status: { in: ["CONFIRMED", "TENTATIVE", "DRAFT", "PARTIALLY_CHECKED_IN"] },
      arrivalDate: { lt: departureDate },
      departureDate: { gt: arrivalDate },
    },
    select: {
      id: true,
      arrivalDate: true,
      departureDate: true,
      rooms: {
        where: {
          status: { in: ["CONFIRMED", "HELD"] },
        },
        select: {
          id: true,
          roomTypeId: true,
          assignedRoomId: true,
          stays: {
            where: { status: { in: ["IN_HOUSE", "DUE_IN"] } },
            select: { id: true },
          },
        },
      },
    },
  });

  const checkedInResRoomIds = new Set<string>();
  for (const s of stays) {
    if (s.reservationRoomId) checkedInResRoomIds.add(s.reservationRoomId);
  }

  return roomTypes.map((rt: any) => {
    const rtRooms = rooms.filter((r: any) => r.roomTypeId === rt.id);
    const rtRoomIds = new Set<string>(rtRooms.map((r: any) => r.id));
    const totalRooms = rtRooms.length;

    if (totalRooms === 0) {
      return {
        roomTypeId: rt.id,
        roomTypeCode: rt.code,
        roomTypeName: rt.name,
        totalRooms: 0,
        occupiedOrBlocked: 0,
        availableCount: 0,
        capacity: rt.capacity,
      };
    }

    const nightlyAvailable: number[] = [];

    for (const night of serviceDates) {
      const occupiedPhysical = new Set<string>();
      let unassignedCount = 0;

      // 1. Blocks on night
      for (const b of blocks) {
        if (!rtRoomIds.has(b.roomId)) continue;
        const bStart = inventoryDate(b.startsAt);
        const bEnd = b.endsAt ? inventoryDate(b.endsAt) : "9999-12-31";
        if (bStart <= night && bEnd > night) {
          occupiedPhysical.add(b.roomId);
        }
      }

      // 2. Stays on night
      for (const s of stays) {
        const sArr = inventoryDate(s.arrivalAt);
        const sDep = inventoryDate(s.expectedDepartureAt);
        if (sArr <= night && sDep > night) {
          let assignedOnNight = false;
          for (const ra of s.roomAssignments) {
            const raStart = inventoryDate(ra.startsAt);
            const raEnd = ra.endsAt ? inventoryDate(ra.endsAt) : sDep;
            if (raStart <= night && raEnd > night) {
              if (rtRoomIds.has(ra.roomId)) {
                occupiedPhysical.add(ra.roomId);
                assignedOnNight = true;
              }
            }
          }
          if (!assignedOnNight) {
            const stayRtId = s.reservationRoom?.roomTypeId || s.roomAssignments[0]?.room?.roomTypeId;
            if (stayRtId === rt.id) {
              unassignedCount++;
            }
          }
        }
      }

      // 3. Reservations on night
      for (const res of reservations) {
        if (res.arrivalDate <= night && res.departureDate > night) {
          for (const rm of res.rooms) {
            if (rm.roomTypeId !== rt.id) continue;
            if (checkedInResRoomIds.has(rm.id) || rm.stays.length > 0) continue;

            if (rm.assignedRoomId && rtRoomIds.has(rm.assignedRoomId)) {
              occupiedPhysical.add(rm.assignedRoomId);
            } else {
              unassignedCount++;
            }
          }
        }
      }

      const totalOccupied = occupiedPhysical.size + unassignedCount;
      nightlyAvailable.push(Math.max(0, totalRooms - totalOccupied));
    }

    const availableCount = nightlyAvailable.length ? Math.min(...nightlyAvailable) : totalRooms;
    const occupiedOrBlocked = Math.max(0, totalRooms - availableCount);

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

export async function isPhysicalRoomAvailable(
  roomId: string,
  arrivalDate: string,
  departureDate: string,
  db: any = prisma,
  excludeReservationId?: string
): Promise<boolean> {
  const { serviceDates } = validateStayInterval(arrivalDate, departureDate);

  const room = await db.room.findUnique({
    where: { id: roomId },
    select: { id: true, active: true, propertyId: true },
  });
  if (!room || !room.active) return false;
  const property = await db.property.findUniqueOrThrow({ where: { id: room.propertyId }, select: { timezone: true } });
  const inventoryDate = (timestamp: Date | string) => toServiceDate(timestamp, property.timezone);

  const blocks = await db.roomBlock.findMany({
    where: {
      roomId,
      status: "ACTIVE",
    },
    select: { startsAt: true, endsAt: true },
  });
  for (const b of blocks) {
    const bStart = inventoryDate(b.startsAt);
    const bEnd = b.endsAt ? inventoryDate(b.endsAt) : "9999-12-31";
    for (const night of serviceDates) {
      if (bStart <= night && bEnd > night) return false;
    }
  }

  const assignments = await db.roomAssignment.findMany({
    where: {
      roomId,
      stay: { status: { in: ["IN_HOUSE", "DUE_IN"] } },
    },
    select: { startsAt: true, endsAt: true, stay: { select: { arrivalAt: true, expectedDepartureAt: true } } },
  });
  for (const a of assignments) {
    const aStart = [inventoryDate(a.startsAt), inventoryDate(a.stay.arrivalAt)].sort().at(-1)!;
    const aEnd = [a.endsAt ? inventoryDate(a.endsAt) : "9999-12-31", inventoryDate(a.stay.expectedDepartureAt)].sort()[0];
    for (const night of serviceDates) {
      if (aStart <= night && aEnd > night) return false;
    }
  }

  const resRooms = await db.reservationRoom.findMany({
    where: {
      assignedRoomId: roomId,
      status: { in: ["CONFIRMED", "HELD"] },
      reservation: {
        status: { in: ["CONFIRMED", "TENTATIVE", "DRAFT", "PARTIALLY_CHECKED_IN"] },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
    },
    select: {
      reservation: { select: { arrivalDate: true, departureDate: true } },
      stays: {
        where: { status: { in: ["IN_HOUSE", "DUE_IN"] } },
        select: { id: true },
      },
    },
  });

  for (const rr of resRooms) {
    if (rr.stays.length > 0) continue;
    const rStart = rr.reservation.arrivalDate;
    const rEnd = rr.reservation.departureDate;
    for (const night of serviceDates) {
      if (rStart <= night && rEnd > night) return false;
    }
  }

  return true;
}

export async function quoteStay(req: QuoteRequest): Promise<QuoteResult> {
  const { nights: nightsCount, serviceDates } = validateStayInterval(req.arrivalDate, req.departureDate);

  const roomType = await prisma.roomType.findUniqueOrThrow({
    where: { id: req.roomTypeId },
  });

  const property = await prisma.property.findUniqueOrThrow({
    where: { id: req.propertyId },
  });

  let ratePlan = req.ratePlanId
    ? await prisma.ratePlan.findUnique({
        where: { id: req.ratePlanId },
        include: { versions: { where: { roomTypeId: req.roomTypeId } } },
      })
    : await prisma.ratePlan.findFirst({
        where: { propertyId: req.propertyId, active: true },
        include: { versions: { where: { roomTypeId: req.roomTypeId } } },
      });

  const baseRate = 3500;
  const nights: QuoteNight[] = [];
  let subtotal = 0;
  let totalTax = 0;
  let totalAmount = 0;

  for (const serviceDate of serviceDates) {
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
    availableRoomsCount: rtAvail?.availableCount ?? 0,
  };
}

export async function checkInGuest(input: Parameters<typeof checkInGuestTransaction>[1]) {
  // The reservation status, stay, folio and advance allocation either all commit or all roll back.
  return prisma.$transaction(tx => checkInGuestTransaction(tx, input), { maxWait: 10000, timeout: 30000 });
}

async function checkInGuestTransaction(tx: Prisma.TransactionClient, {
  propertyId,
  reservationId,
  guestData,
  roomIds,
  groupBilling = true,
  roomRates,
  roomPax,
  arrivalAt,
  expectedDepartureAt,
  adults = 2,
  children = 0,
  paxM,
  paxF,
  paxC,
  ratePlanId,
  depositAmount = 0,
  additionalDepositAmount,
  depositMethod = "CASH",
  depositRef,
  agreedTariff,
  isComplimentary = false,
  isRateInclusive = true,
  checkoutType = "FIXED_TIME",
  gracePeriodMinutes = 0,
  extraBeds = 0,
  extraBedRate = 500,
  actorId,
  overrideReason,
  coGuests,
  foreignDetails,
  kitchenDining = "NO",
  diningFixedRate = 0,
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
  roomPax?: Record<string, { adults?: number; children?: number }>;
  arrivalAt?: Date;
  expectedDepartureAt: Date;
  adults?: number;
  children?: number;
  paxM?: number;
  paxF?: number;
  paxC?: number;
  ratePlanId?: string;
  depositAmount?: number;
  additionalDepositAmount?: number;
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
  kitchenDining?: string;
  diningFixedRate?: number;
}) {
  additionalCheckinCollection(depositAmount, 0, additionalDepositAmount);
  const property = await tx.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  // Verify rooms exist and check cleanliness
  const rooms = await tx.room.findMany({
    where: { id: { in: roomIds } },
    include: { roomState: true, roomType: true },
  });

  if (rooms.length !== roomIds.length) {
    throw new Error("One or more rooms not found.");
  }

  const effectiveArrDate = toServiceDate(arrivalAt || new Date(), property.timezone);
  const effectiveDepDate = toServiceDate(expectedDepartureAt, property.timezone);
  if (effectiveDepDate <= effectiveArrDate) {
    throw new Error("Departure date must be strictly after arrival date.");
  }

  const now = new Date();
  for (const room of rooms) {
    if (room.propertyId !== propertyId) {
      throw new Error(`Room ${room.number} belongs to a different property.`);
    }
    if (!room.active) {
      throw new Error(`Room ${room.number} is inactive.`);
    }
    if (room.roomState?.occupancyStatus === "OCCUPIED") {
      throw new Error(`Room ${room.number} is already occupied.`);
    }
    if (room.roomState?.sellabilityStatus !== "SELLABLE") {
      throw Object.assign(new Error(`Room ${room.number} must be sellable before check-in.`), { statusCode: 409 });
    }
    if (!["CLEAN", "INSPECTED"].includes(room.roomState.housekeepingStatus)) {
      throw Object.assign(new Error(`Room ${room.number} must be cleaned before check-in.`), { statusCode: 409 });
    }
    const activeBlock = await tx.roomBlock.findFirst({
      where: {
        roomId: room.id,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    });
    if (activeBlock) {
      throw new Error(`Room ${room.number} is currently blocked (${activeBlock.type}: ${activeBlock.reason}).`);
    }
  }

  const { pureName: canonicalGuestName } = normalizeGuestName(guestData.name, guestData.title);

  // 1. Find or create Guest (matching by name and phone/email to prevent overwriting different family members/group members)
  let guest: any = null;
  if (canonicalGuestName) {
    guest = await tx.guest.findFirst({
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
    guest = await tx.guest.create({
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
    await tx.guest.update({
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
    await tx.guestDocument.create({
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
  let existingReservation: any = null;
  if (!resId) {
    const seq = await getNextDocumentNumber(propertyId, "RESERVATION", "PROPERTY", tx);
    const newRes = await tx.reservation.create({
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
    existingReservation = await tx.reservation.findUnique({
      where: { id: resId },
      include: { rooms: true },
    });
    if (!existingReservation || existingReservation.propertyId !== propertyId) {
      throw new Error("Reservation not found for this property.");
    }
    if (["CANCELLED", "NO_SHOW", "COMPLETED"].includes(existingReservation.status)) {
      throw new Error(`Cannot check in a ${existingReservation.status.toLowerCase()} reservation.`);
    }
    if (existingReservation.status === "CHECKED_IN") {
      throw new Error("Reservation is already checked in.");
    }
    await tx.reservation.update({
      where: { id: resId },
      data: { status: "CHECKED_IN" },
    });
    await tx.reservationRoom.updateMany({
      where: { reservationId: resId },
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
    const stay = await tx.stay.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        reservationRoomId: existingReservation?.rooms[0]?.id || null,
        primaryGuestId: guest.id,
        status: "IN_HOUSE",
        arrivalAt: arrivalAt || new Date(),
        expectedDepartureAt,
        adults,
        children,
      },
    });
    stayIdsForDeposit.push(stay.id);

    const folio = await tx.folio.create({
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

    const guestWindow = await tx.folioWindow.create({
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

    await tx.stay.update({
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
          const rateVersion = await tx.ratePlanVersion.findFirst({
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
          const rateVersion = await tx.ratePlanVersion.findFirst({
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

      await tx.roomAssignment.create({
        data: {
          stayId: stay.id,
          roomId: room.id,
          startsAt: new Date(),
          moveReason: isComp ? "AGREED_RATE:0" : `AGREED_RATE:${roomBasePrice}:${isRateInclusive !== false ? "INC" : "EXC"}`,
          rateHandling: isComp ? "COMPLIMENTARY" : (checkoutType === "24_HOURS" ? `24_HOURS:${gracePeriodMinutes}` : `FIXED_TIME:${gracePeriodMinutes}`),
        },
      });

      await tx.roomState.upsert({
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

      await tx.folioEntry.create({
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

      await tx.folioEntry.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          folioId: folio.id,
          folioWindowId: guestWindow.id,
          serviceDate: serviceDateStr,
          type: "CHARGE",
          chargeCode: "EXTRA_PAX",
          description: `Extra Pax - Room ${rooms[0]?.number || ""} (${extraBeds} Pax x ₹${extraBedRate}/night - Night 1)`,
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

    // 3. Post Fixed Kitchen Dining Charge if selected
    if (kitchenDining === "YES" && diningFixedRate && diningFixedRate > 0) {
      const diningGst = calculateGST({
        grossOrBaseAmount: diningFixedRate,
        isInclusive: true,
        sacHsn: "996331",
        supplierStateCode: property.stateCode || "18",
        customTaxRate: 5,
      });

      await tx.folioEntry.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          folioId: folio.id,
          folioWindowId: guestWindow.id,
          serviceDate: serviceDateStr,
          type: "CHARGE",
          chargeCode: "RESTAURANT_FOOD",
          description: `Kitchen Dining Plan (Fixed @ ₹${diningFixedRate}/Day)`,
          qty: 1,
          unitAmount: diningFixedRate,
          taxableAmount: diningGst.taxableAmount,
          taxComponentsJson: JSON.stringify(diningGst.components),
          totalAmount: diningGst.totalAmount,
          sourceType: "POS_ROOM_POST",
          status: "POSTED",
        },
      });

      totalBalanceAdded += diningGst.totalAmount;
    }

    await tx.folio.update({
      where: { id: folio.id },
      data: { balance: totalBalanceAdded },
    });
  } else {
    // SEPARATE STAYS & FOLIOS FOR EACH ROOM
    const primaryRoomId = roomIds[0];

    for (const room of rooms) {
      const isPrimaryRoom = room.id === primaryRoomId;
      const roomAssignedAdults = roomPax?.[room.id]?.adults ?? roomPax?.[room.number]?.adults ?? Math.max(1, Math.floor(adults / rooms.length));
      const roomAssignedChildren = roomPax?.[room.id]?.children ?? roomPax?.[room.number]?.children ?? 0;
      const stay = await tx.stay.create({
        data: {
          organizationId: property.organizationId, propertyId, primaryGuestId: guest.id,
          reservationRoomId: existingReservation?.rooms[rooms.indexOf(room)]?.id || null,
          status: "IN_HOUSE", arrivalAt: arrivalAt || new Date(), expectedDepartureAt,
          adults: roomAssignedAdults, children: roomAssignedChildren,
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
          const rateVersion = await tx.ratePlanVersion.findFirst({
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
          const rateVersion = await tx.ratePlanVersion.findFirst({
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

      await tx.roomAssignment.create({
        data: {
          stayId: stay.id,
          roomId: room.id,
          startsAt: new Date(),
          moveReason: isComp ? "AGREED_RATE:0" : `AGREED_RATE:${roomBasePrice}:${isRateInclusive !== false ? "INC" : "EXC"}`,
          rateHandling: isComp ? "COMPLIMENTARY" : (checkoutType === "24_HOURS" ? `24_HOURS:${gracePeriodMinutes}` : `FIXED_TIME:${gracePeriodMinutes}`),
        },
      });

      await tx.roomState.upsert({
        where: { roomId: room.id },
        create: {
          organizationId: property.organizationId, propertyId, roomId: room.id, occupancyStatus: "OCCUPIED",
          housekeepingStatus: room.roomState?.housekeepingStatus || "CLEAN", sellabilityStatus: "SELLABLE",
        },
        update: { occupancyStatus: "OCCUPIED", lastChangedAt: new Date() },
      });

      const folio = await tx.folio.create({
        data: { organizationId: property.organizationId, propertyId, stayId: stay.id, status: "OPEN", currency: property.currency, balance: 0 },
      });
      if (!masterFolioId) {
        masterFolioId = folio.id;
      }

      const guestWindow = await tx.folioWindow.create({
        data: {
          folioId: folio.id, name: "Guest Window", windowNumber: 1, payerType: "GUEST",
          guestOrCompanySnapshot: JSON.stringify({ name: guest.name, phone: guest.phone, gstin: guest.gstin }), status: "OPEN",
        },
      });
      if (!guestWindowForDeposit) {
        guestWindowForDeposit = guestWindow;
      }

      await tx.stay.update({ where: { id: stay.id }, data: { folioId: folio.id } });

      const initialNightPrice = roomBasePrice * 1;
      const roomGst = isComp
        ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
        : calculateGST({
            grossOrBaseAmount: initialNightPrice, isInclusive: isRateInclusive !== false, sacHsn: "996311",
            supplierStateCode: property.stateCode || "18", customTaxRate: 5,
          });

      await tx.folioEntry.create({
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

      await tx.folio.update({
        where: { id: folio.id },
        data: { balance: roomGst.totalAmount },
      });
      totalBalanceAdded += roomGst.totalAmount;
    }
  }

  const carriedAdvance = await carryReservationAdvance(tx, {
    propertyId, reservationId, folioId: masterFolioId!, folioWindowId: guestWindowForDeposit.id,
    groupPool: rooms.length > 1, applyToBalance: rooms.length === 1 || groupBilling, actorId,
  });
  depositAmount = additionalCheckinCollection(depositAmount, carriedAdvance.collectedAmount, additionalDepositAmount);
  const totalCheckinAdvance = Math.round((carriedAdvance.amount + depositAmount) * 100) / 100;

  // 8. Handle advance deposit if provided
  if (depositAmount > 0) {
    const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT", "PROPERTY", tx);
    const isBTC = depositMethod === "DIRECT_BILL";
    const isMultiRoomGroup = rooms.length > 1;

    const payment = await tx.payment.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        receiptNo: recSeq.formattedNumber,
        folioId: masterFolioId!,
        reservationId: resId,
        idempotencyKey: `CHECKIN_ADVANCE:${masterFolioId}`,
        amount: depositAmount,
        method: depositMethod || "CASH",
        reference: depositRef || (isBTC ? `BTC-${guestData.companyName || "CORP"}` : (isMultiRoomGroup ? `GROUP_ADVANCE_POOL:₹${depositAmount}` : undefined)),
        payerSnapshot: JSON.stringify({
          reservationNo: existingReservation?.confirmationNo,
          category: "ADVANCE_DEPOSIT",
          collectionStage: "CHECK_IN_ADDITIONAL",
          name: guestData.name,
          phone: guestData.phone,
          companyName: guestData.companyName || "",
          gstin: guestData.gstin || "",
          billToCompany: isBTC,
          isGroupAdvancePool: isMultiRoomGroup,
          totalGroupRooms: rooms.length,
          groupRoomNumbers: rooms.map((r) => r.number),
        }),
        status: "SUCCEEDED",
        createdById: actorId,
      },
    });

    await tx.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        folioWindowId: guestWindowForDeposit.id,
        amount: depositAmount,
      },
    });

    // Record unallocated Group Advance Pool in Deposit table
    if (isMultiRoomGroup) {
      await tx.deposit.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          reservationId: reservationId || null,
          folioId: masterFolioId!,
          paymentId: payment.id,
          originalAmount: depositAmount,
          availableAmount: depositAmount,
          status: "AVAILABLE",
        },
      });
    }

    // Only decrement individual room folio balance if single room or consolidated group billing
    // For separate room billing (!groupBilling), the advance is held in the group pool, not deducted from Room 1
    if (!isMultiRoomGroup || groupBilling) {
      await tx.folio.update({
        where: { id: masterFolioId! },
        data: { balance: { decrement: depositAmount } },
      });
    }
  }

  // 9. Generate GRC Registration Record
  const grcSeq = await getNextDocumentNumber(propertyId, "GRC", "PROPERTY", tx);
  const formattedArrival = (arrivalAt || new Date()).toISOString();

  // Normalize roomPax breakdown for all rooms
  const normalizedRoomPax: Record<string, { adults: number; children: number }> = {};
  for (const r of rooms) {
    const custom = roomPax?.[r.id] || roomPax?.[r.number];
    if (custom) {
      normalizedRoomPax[r.number] = {
        adults: Number(custom.adults) || 2,
        children: Number(custom.children) || 0,
      };
    } else {
      normalizedRoomPax[r.number] = {
        adults: Math.max(1, Math.min(adults || 2, r.roomType?.capacity || 2)),
        children: 0,
      };
    }
  }

  const registration = await tx.guestRegistration.create({
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
      mobilePhone: (guestData as any).mobilePhone || guestData.phone || guest.phone || "0000000000",
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
      depositAmount: totalCheckinAdvance,
      processedByUserId: actorId,
      internalNotes: JSON.stringify({
        adults: adults || 2,
        children: children || 0,
        paxM,
        paxF,
        paxC,
        agreedTariff,
        isRateInclusive,
        checkoutType,
        gracePeriodMinutes,
        depositAmount: totalCheckinAdvance,
        reservationAdvanceApplied: carriedAdvance.amount,
        additionalDepositCollected: depositAmount,
        reservationAdvanceReceiptNos: carriedAdvance.receiptNos,
        advancePaymentMethod: depositMethod,
        kitchenDining: kitchenDining || "NO",
        diningFixedRate: diningFixedRate || 0,
        extraPaxCount: extraBeds || 0,
        extraBedRate: extraBedRate || 500,
        roomPax: normalizedRoomPax,
        roomExtraPax: rooms.reduce((acc, r, idx) => {
          if (idx === 0) acc[r.number] = extraBeds || 0;
          return acc;
        }, {} as Record<string, number>),
      }),
    },
  });

  // 10. Write Audit Log
  await tx.auditLog.create({
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
        depositAmount: totalCheckinAdvance,
        reservationAdvanceApplied: carriedAdvance.amount,
        additionalDepositCollected: depositAmount,
        reservationAdvanceReceiptNos: carriedAdvance.receiptNos,
      }),
    },
  });

  return { success: true, advance: { carried: carriedAdvance.amount, collectedNow: depositAmount, total: totalCheckinAdvance, originalReceiptNos: carriedAdvance.receiptNos }, stayIds: stayIdsForDeposit, guest, masterFolioId, registration };
}

export async function moveRoom({
  stayId,
  fromRoomId,
  sourceRoomId,
  targetRoomId,
  reason,
  rateHandling = "RETAIN_RATE",
  customRate,
  actorId,
  transferCreditAmount,
  transferRemarks,
}: {
  stayId: string;
  fromRoomId?: string;
  sourceRoomId?: string;
  targetRoomId: string;
  reason: string;
  rateHandling?: string;
  customRate?: number;
  actorId?: string;
  transferCreditAmount?: number;
  transferRemarks?: string;
}) {
  let targetStay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: {
      roomAssignments: { where: { endsAt: null }, include: { room: { include: { roomType: true } } } },
      primaryGuest: true,
      property: true,
      folio: {
        include: {
          windows: { include: { entries: true } },
        },
      },
    },
  });

  if (!targetStay) {
    throw new Error("Stay not found.");
  }

  const targetRoom = await prisma.room.findUniqueOrThrow({
    where: { id: targetRoomId },
    include: { roomState: true, roomType: true },
  });

  if (targetRoom.propertyId !== targetStay.propertyId) {
    throw new Error("Target room belongs to a different property.");
  }
  if (!targetRoom.active) {
    throw new Error("Target room is inactive.");
  }
  if (targetRoom.roomState?.occupancyStatus === "OCCUPIED") {
    throw new Error(`Target room ${targetRoom.number} is currently occupied.`);
  }
  if (targetRoom.roomState?.sellabilityStatus !== "SELLABLE" && !reason) {
    throw new Error(`Target room ${targetRoom.number} is ${targetRoom.roomState?.sellabilityStatus}. Override reason required.`);
  }
  const moveNow = new Date();
  const activeTargetBlock = await prisma.roomBlock.findFirst({
    where: {
      roomId: targetRoom.id,
      status: "ACTIVE",
      startsAt: { lte: moveNow },
      OR: [{ endsAt: null }, { endsAt: { gt: moveNow } }],
    },
  });
  if (activeTargetBlock) {
    throw new Error(`Target room ${targetRoom.number} is currently blocked (${activeTargetBlock.type}: ${activeTargetBlock.reason}).`);
  }

  const effectiveFromRoomId = fromRoomId || sourceRoomId;

  // 1. Identify which specific room assignment is being moved in targetStay
  let currentAssignment = effectiveFromRoomId
    ? targetStay.roomAssignments.find(
        (ra) =>
          ra.roomId === effectiveFromRoomId ||
          ra.room?.id === effectiveFromRoomId ||
          ra.room?.number === effectiveFromRoomId
      )
    : targetStay.roomAssignments[0];

  // If not found in targetStay (e.g., separate-stay group booking where stayId belonged to another room),
  // locate the active in-house stay that actually owns effectiveFromRoomId!
  if (!currentAssignment && effectiveFromRoomId) {
    const matchingAssignment = await prisma.roomAssignment.findFirst({
      where: {
        OR: [
          { roomId: effectiveFromRoomId },
          { room: { id: effectiveFromRoomId } },
          { room: { number: effectiveFromRoomId } },
        ],
        endsAt: null,
        stay: { propertyId: targetStay.propertyId, status: "IN_HOUSE" },
      },
      include: {
        room: { include: { roomType: true } },
        stay: {
          include: {
            roomAssignments: { where: { endsAt: null }, include: { room: { include: { roomType: true } } } },
            primaryGuest: true,
            property: true,
            folio: {
              include: {
                windows: { include: { entries: true } },
              },
            },
          },
        },
      },
    });

    if (matchingAssignment && matchingAssignment.stay) {
      targetStay = matchingAssignment.stay;
      currentAssignment = matchingAssignment;
    }
  }

  if (!currentAssignment) {
    throw new Error("No active room assignment found for this stay to move.");
  }

  const oldRoomId = currentAssignment.roomId;
  const oldRoomNumber = currentAssignment.room?.number;

  // 2. Accurately resolve existing agreed rate for current assignment
  let existingRate = 3200;
  let isExistingComp = currentAssignment.rateHandling === "COMPLIMENTARY";
  let isExistingInclusive = true;

  if (currentAssignment.moveReason?.includes("AGREED_RATE:")) {
    const rateSection = currentAssignment.moveReason.slice(currentAssignment.moveReason.indexOf("AGREED_RATE:"));
    const parts = rateSection.replace("AGREED_RATE:", "").split(":");
    existingRate = Number(parts[0]) || 3200;
    if (parts[1] === "EXC") isExistingInclusive = false;
    if (existingRate === 0) isExistingComp = true;
  } else {
    // Check if existing folio entries have a posted ROOM_TARIFF charge for this room
    const oldNum = currentAssignment.room?.number;
    const postedTariff = targetStay.folio?.windows?.[0]?.entries?.find((e: any) =>
      e.chargeCode === "ROOM_TARIFF" &&
      e.status === "POSTED" &&
      (oldNum ? e.description?.includes(oldNum) : true)
    );

    if (postedTariff && postedTariff.unitAmount !== undefined) {
      existingRate = Number(postedTariff.unitAmount);
      if (existingRate === 0) isExistingComp = true;
    } else if (currentAssignment.room?.roomTypeId) {
      const currentRv = await prisma.ratePlanVersion.findFirst({
        where: { roomTypeId: currentAssignment.room.roomTypeId, active: true },
        orderBy: { createdAt: "desc" },
      });
      if (currentRv?.pricingJson) {
        try {
          const pricing = JSON.parse(currentRv.pricingJson);
          if (pricing.basePrice) existingRate = Number(pricing.basePrice);
        } catch {}
      }
    }
  }

  // 3. Determine new rate handling and moveReason for the new room assignment
  const numCustomRate =
    customRate !== undefined && customRate !== null && !isNaN(Number(customRate))
      ? Number(customRate)
      : undefined;

  let effectiveNewRate = existingRate;
  let effectiveIsInclusive = isExistingInclusive;

  // Preserve existing checkout policy (24_HOURS vs FIXED_TIME) unless complimentary
  const basePolicyHandling =
    currentAssignment.rateHandling && currentAssignment.rateHandling !== "COMPLIMENTARY" && currentAssignment.rateHandling !== "RETAIN_RATE"
      ? currentAssignment.rateHandling
      : "FIXED_TIME:0";

  let newRateHandling = basePolicyHandling;
  let newMoveReason = `AGREED_RATE:${existingRate}:${isExistingInclusive ? "INC" : "EXC"}`;

  if (rateHandling === "COMPLIMENTARY" || numCustomRate === 0) {
    newRateHandling = "COMPLIMENTARY";
    newMoveReason = "AGREED_RATE:0";
    effectiveNewRate = 0;
  } else if ((rateHandling === "CUSTOM" || numCustomRate !== undefined) && numCustomRate !== undefined && numCustomRate > 0) {
    newRateHandling = basePolicyHandling;
    newMoveReason = `AGREED_RATE:${numCustomRate}:${isExistingInclusive ? "INC" : "EXC"}`;
    effectiveNewRate = numCustomRate;
  } else if (rateHandling === "USE_TARGET_BASE") {
    let targetBase = Number((targetRoom.roomType as any)?.basePrice) || 3200;
    if (targetRoom.roomTypeId) {
      const targetRv = await prisma.ratePlanVersion.findFirst({
        where: { roomTypeId: targetRoom.roomTypeId, active: true },
        orderBy: { createdAt: "desc" },
      });
      if (targetRv?.pricingJson) {
        try {
          const pricing = JSON.parse(targetRv.pricingJson);
          if (pricing.basePrice) targetBase = Number(pricing.basePrice);
        } catch {}
      }
    }
    newRateHandling = basePolicyHandling;
    newMoveReason = `AGREED_RATE:${targetBase}:INC`;
    effectiveNewRate = targetBase;
    effectiveIsInclusive = true;
  } else {
    // RETAIN_RATE
    newRateHandling = isExistingComp ? "COMPLIMENTARY" : basePolicyHandling;
    newMoveReason = isExistingComp ? "AGREED_RATE:0" : `AGREED_RATE:${existingRate}:${isExistingInclusive ? "INC" : "EXC"}`;
    effectiveNewRate = isExistingComp ? 0 : existingRate;
  }

  // Tag predecessor room into moveReason for tracking lineage:
  // Format: "MOVED_FROM:101|AGREED_RATE:3500:INC"
  const lineageMoveReason = oldRoomNumber
    ? `MOVED_FROM:${oldRoomNumber}|${newMoveReason}`
    : newMoveReason;

  // 4. Close current room assignment
  await prisma.roomAssignment.update({
    where: { id: currentAssignment.id },
    data: {
      endsAt: new Date(),
      moveReason: `${reason} (Moved to Room ${targetRoom.number})`,
    },
  });

  // 5. Open new room assignment
  await prisma.roomAssignment.create({
    data: {
      stayId: targetStay.id,
      roomId: targetRoomId,
      startsAt: new Date(),
      rateHandling: newRateHandling,
      moveReason: lineageMoveReason,
    },
  });

  // 6. Mark old room as VACANT + DIRTY and create Checkout Clean Task
  if (oldRoomId) {
    await prisma.roomState.upsert({
      where: { roomId: oldRoomId },
      create: {
        organizationId: targetStay.organizationId,
        propertyId: targetStay.propertyId,
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
        organizationId: targetStay.organizationId,
        propertyId: targetStay.propertyId,
        roomId: oldRoomId,
        stayId: targetStay.id,
        type: "CHECKOUT_CLEAN",
        priority: "HIGH",
        status: "OPEN",
        notes: `Auto-generated after room move from Room ${oldRoomNumber || oldRoomId} to Room ${targetRoom.number}. Reason: ${reason}`,
      },
    });
  }

  // 7. Mark target room as OCCUPIED
  await prisma.roomState.upsert({
    where: { roomId: targetRoomId },
    create: {
      organizationId: targetStay.organizationId,
      propertyId: targetStay.propertyId,
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

  // 8. Synchronize GRC Record if exists
  if (targetStay.primaryGuest) {
    try {
      const grc = await prisma.guestRegistration.findFirst({
        where: {
          propertyId: targetStay.propertyId,
          OR: [
            { stayId: targetStay.id },
            ...(targetStay.reservationRoomId ? [{ id: targetStay.reservationRoomId }] : []),
            ...(targetStay.primaryGuest.phone ? [{ mobilePhone: targetStay.primaryGuest.phone }] : []),
            ...(targetStay.primaryGuest.name ? [{ fullName: targetStay.primaryGuest.name }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      if (grc) {
        let updatedNotes = grc.internalNotes;
        let updatedPreAssigned = grc.preAssignedRoom;
        let updatedAssignedNum = grc.assignedRoomNumber;
        let updatedAssignedId = grc.assignedRoomId;

        // Replace oldRoomNumber in preAssignedRoom & assignedRoomNumber (e.g. "101, 102" -> "201, 102")
        if (oldRoomNumber) {
          if (updatedPreAssigned) {
            const parts = updatedPreAssigned.split(",").map((s) => s.trim());
            const replaced = parts.map((p) => (p === oldRoomNumber ? targetRoom.number : p));
            updatedPreAssigned = replaced.join(", ");
          }
          if (updatedAssignedNum) {
            const parts = updatedAssignedNum.split(",").map((s) => s.trim());
            const replaced = parts.map((p) => (p === oldRoomNumber ? targetRoom.number : p));
            updatedAssignedNum = replaced.join(", ");
          }
        }

        if (oldRoomId && updatedAssignedId === oldRoomId) {
          updatedAssignedId = targetRoomId;
        }

        if (grc.internalNotes) {
          try {
            const parsed = JSON.parse(grc.internalNotes);
            if (Array.isArray(parsed.additionalRoomIds) && oldRoomNumber) {
              parsed.additionalRoomIds = parsed.additionalRoomIds.map((rid: string) =>
                rid === oldRoomNumber || rid === oldRoomId ? targetRoom.number : rid
              );
            }
            if (parsed.roomRates) {
              if (oldRoomNumber) delete parsed.roomRates[oldRoomNumber];
              if (oldRoomId) delete parsed.roomRates[oldRoomId];
              parsed.roomRates[targetRoom.number] = effectiveNewRate === 0 ? "0" : String(effectiveNewRate);
              parsed.roomRates[targetRoomId] = effectiveNewRate === 0 ? "0" : String(effectiveNewRate);
            }
            updatedNotes = JSON.stringify(parsed);
          } catch {}
        }

        await prisma.guestRegistration.update({
          where: { id: grc.id },
          data: {
            preAssignedRoom: updatedPreAssigned,
            assignedRoomNumber: updatedAssignedNum,
            assignedRoomId: updatedAssignedId,
            internalNotes: updatedNotes,
          },
        });
      }
    } catch (grcErr) {
      console.warn("GRC sync warning during moveRoom:", grcErr);
    }
  }

  // 9. Record Room Transfer in Folio & Transfer Credit (Industry Standard Practice)
  if (targetStay.folio && targetStay.folio.windows?.[0]) {
    const windowId = targetStay.folio.windows[0].id;
    const today = targetStay.property?.businessDate || new Date().toISOString().split("T")[0];

    // Audit/Informational entry in folio
    await prisma.folioEntry.create({
      data: {
        organizationId: targetStay.organizationId,
        propertyId: targetStay.propertyId,
        folioId: targetStay.folio.id,
        folioWindowId: windowId,
        serviceDate: today,
        type: "ADJUSTMENT",
        chargeCode: "ROOM_TRANSFER",
        description: `Room Transfer: Moved from Room ${oldRoomNumber || "prev"} to Room ${targetRoom.number}${reason ? ` (${reason})` : ""}`,
        qty: 1,
        unitAmount: 0,
        taxableAmount: 0,
        taxComponentsJson: JSON.stringify([]),
        totalAmount: 0,
        sourceType: "ROOM_TRANSFER",
        status: "POSTED",
      },
    });

    // Synchronize latest active cycle's room tariff to reflect the new room & override price:
    const activeEntries = targetStay.folio.windows[0].entries || [];
    const roomTariffEntries = activeEntries
      .filter((e: any) =>
        e.chargeCode === "ROOM_TARIFF" &&
        e.status === "POSTED" &&
        e.sourceType !== "MANUAL_CHARGE" &&
        (oldRoomNumber ? (e.description?.includes(oldRoomNumber) || !e.description?.includes("Room ")) : true)
      )
      .sort((a: any, b: any) => new Date(b.createdAt || b.serviceDate).getTime() - new Date(a.createdAt || a.serviceDate).getTime());

    if (roomTariffEntries.length > 0) {
      const latestTariff = roomTariffEntries[0];
      const isCompRate = effectiveNewRate === 0 || newRateHandling === "COMPLIMENTARY";
      const gst = isCompRate
        ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
        : calculateGST({
            grossOrBaseAmount: effectiveNewRate,
            isInclusive: effectiveIsInclusive,
            sacHsn: "996311",
            supplierStateCode: targetStay.property?.stateCode || "18",
            customTaxRate: 5,
          });

      let updatedDesc = latestTariff.description || "";
      if (oldRoomNumber && updatedDesc.includes(oldRoomNumber)) {
        updatedDesc = updatedDesc.replace(new RegExp(`\\b(?:Room|Rm)?\\s*#?\\s*${oldRoomNumber}\\b`, "i"), `Room ${targetRoom.number}`);
      } else if (!updatedDesc.includes(targetRoom.number)) {
        updatedDesc = `Room Tariff - Room ${targetRoom.number}`;
      }

      await prisma.folioEntry.update({
        where: { id: latestTariff.id },
        data: {
          description: updatedDesc,
          unitAmount: effectiveNewRate,
          taxableAmount: gst.taxableAmount,
          taxComponentsJson: JSON.stringify(gst.components),
          totalAmount: gst.totalAmount,
        },
      });
    }

    try {
      await sync24HourFolioCharges({ folioId: targetStay.folio.id });
    } catch (syncErr) {
      console.warn("Folio 24h sync warning during moveRoom:", syncErr);
    }
  }

  // 10. Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: targetStay.organizationId,
      propertyId: targetStay.propertyId,
      actorId,
      action: "ROOM_MOVE",
      targetType: "STAY",
      targetId: targetStay.id,
      reason,
      afterJson: JSON.stringify({
        fromRoomId: oldRoomId,
        fromRoomNumber: oldRoomNumber,
        toRoomId: targetRoomId,
        targetRoomNumber: targetRoom.number,
        rateHandling: newRateHandling,
        moveReason: lineageMoveReason,
        transferCreditAmount,
      }),
    },
  });

  return {
    success: true,
    stayId: targetStay.id,
    oldRoomNumber,
    targetRoomNumber: targetRoom.number,
    newRoomNumber: targetRoom.number,
  };
}

