import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { quoteStay, calculateAvailability, isPhysicalRoomAvailable } from "@/lib/domain/pms-service";
import { validateStayInterval, DateValidationError } from "@/lib/domain/booking-dates";
import { round2 } from "@/lib/gst/calculator";
import { quoteReservationNight, getReservationRateTerms } from "@/lib/domain/reservation-pricing";
import { normalizeGuestName } from "@/lib/domain/name-utils";
import { logAuditEvent } from "@/lib/domain/audit-service";

export async function GET(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        ...(status ? { status } : {}),
      },
      include: {
        primaryGuest: true,
        rooms: {
          include: {
            nights: true,
          },
        },
        deposits: true,
        notesHistory: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const advancePayments = await prisma.payment.findMany({ where: { propertyId, id: { in: reservations.flatMap(r => r.deposits.map(d => d.paymentId)) } }, select: { id: true, amount: true, receiptNo: true, method: true, status: true, receivedAt: true } });
    const advancePaymentMap = new Map(advancePayments.map(p => [p.id, p]));
    const reservationsWithReceipts = reservations.map(r => ({ ...r, deposits: r.deposits.map(d => ({ ...d, payment: advancePaymentMap.get(d.paymentId) || null })) }));

    // Enrich with room types for quick client rendering
    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId },
    });
    const rtMap = new Map(roomTypes.map((rt) => [rt.id, rt]));

    const enriched = reservationsWithReceipts.map((res) => {
      const firstRoom = res.rooms[0];
      const rt = firstRoom ? rtMap.get(firstRoom.roomTypeId) : null;
      return {
        ...res,
        roomType: rt,
        roomTypeName: rt?.name || "Standard Room",
        roomTypeCode: rt?.code || "STD",
        roomCount: res.rooms.length || 1,
        adults: firstRoom?.adults ?? 2,
        children: firstRoom?.children ?? 0,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function resolveRoomTypeId(item: any, fallbackId?: string): string {
  if (item?.roomTypeId) return item.roomTypeId;
  const code = (item?.categoryCode || item?.code || "").toUpperCase();
  const name = (item?.roomName || item?.name || "").toLowerCase();
  const bedType = (item?.bedType || "").toLowerCase();
  const slug = (item?.roomSlug || item?.slug || "").toLowerCase();

  if (code === "DELUXE_KING" || (bedType.includes("king") && (name.includes("deluxe") || slug.includes("deluxe")))) {
    return "rt_deluxe_king";
  }
  if (code === "DELUXE_TWIN" || (bedType.includes("twin") && (name.includes("deluxe") || slug.includes("deluxe")))) {
    return "rt_deluxe_twin";
  }
  if (code === "EXEC_KING" || (bedType.includes("king") && (name.includes("exec") || slug.includes("exec")))) {
    return "rt_exec_king";
  }
  if (code === "EXEC_TWIN" || (bedType.includes("twin") && (name.includes("exec") || slug.includes("exec")))) {
    return "rt_exec_twin";
  }
  if (code === "SUITE" || name.includes("suite") || slug.includes("suite")) {
    return "rt_suite";
  }
  if (name.includes("deluxe") || slug.includes("deluxe")) {
    return "rt_deluxe_king";
  }
  return fallbackId || "rt_deluxe_king";
}

interface NormalizedRoomItem {
  roomTypeId: string;
  adults: number;
  children: number;
  ratePerNight: number;
  bedType?: string;
}

export async function POST(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const body = await request.json();
    let {
      propertyId,
      guestName,
      guestPhone,
      guestEmail,
      guestGstin,
      guestCity,
      guestState,
      guestNationality = "Indian",
      roomTypeId,
      roomCount = 1,
      bookedRooms,
      assignedRoomId,
      arrivalDate,
      departureDate,
      checkIn,
      checkOut,
      adults = 2,
      children = 0,
      source = "DIRECT",
      bookingType,
      b2b,
      agencyName,
      agencyPhone,
      companyName,
      channelRef,
      ratePerNight,
      isRateInclusive = false,
      depositAmount,
      depositMethod,
      paymentMethod,
      notes,
      specialRequests,
      promoCode,
      discountAmount = 0,
      baseAmount,
      taxAmount,
      totalAmount,
    } = body;

    if (typeof isRateInclusive !== "boolean") {
      return NextResponse.json({ error: "isRateInclusive must be a boolean." }, { status: 400 });
    }

    // Validate counts before expanding room arrays or calculating nightly records.
    const quantities = Array.isArray(bookedRooms) && bookedRooms.length > 0
      ? bookedRooms.map((item: any) => item?.quantity === undefined ? 1 : Number(item.quantity))
      : [Number(roomCount)];
    if (quantities.some((quantity: number) => !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) || quantities.reduce((sum: number, quantity: number) => sum + quantity, 0) > 1000) {
      return NextResponse.json({ error: "Room quantities must be positive whole numbers, with at most 1000 rooms per request." }, { status: 400 });
    }

    // 1. Resolve Aliased Fields
    const effectiveArrival = arrivalDate || checkIn;
    const effectiveDeparture = departureDate || checkOut;
    const effectiveNotes = notes || specialRequests || "";

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required." },
        { status: 400 }
      );
    }

    if (!effectiveArrival || !effectiveDeparture || !guestName) {
      return NextResponse.json(
        { error: "Guest Name, Check-In Date, and Check-Out Date are required." },
        { status: 400 }
      );
    }

    // 2. Strict Calendar Date Interval Validation (rejection of invalid/reversed dates)
    let validatedDates: { arrivalDate: string; departureDate: string; nights: number; serviceDates: string[] };
    try {
      validatedDates = validateStayInterval(effectiveArrival, effectiveDeparture);
    } catch (err: any) {
      if (err instanceof DateValidationError) {
        return NextResponse.json(
          { error: err.message, code: "INVALID_DATE_INTERVAL" },
          { status: 400 }
        );
      }
      throw err;
    }

    const { nights: nightsCount, serviceDates } = validatedDates;

    // 3. Verify Property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found." },
        { status: 404 }
      );
    }

    // 4. Resolve multi-room / single-room items
    let roomsToCreate: NormalizedRoomItem[] = [];

    if (Array.isArray(bookedRooms) && bookedRooms.length > 0) {
      for (const item of bookedRooms) {
        const resolvedRtId = resolveRoomTypeId(item, roomTypeId);
        const qty = Math.max(1, Number(item.quantity) || 1);
        const rate = Number(item.pricePerNight) >= 0 ? Number(item.pricePerNight) : Number(ratePerNight) >= 0 ? Number(ratePerNight) : 3500;
        for (let q = 0; q < qty; q++) {
          roomsToCreate.push({
            roomTypeId: resolvedRtId,
            adults: Math.max(1, Math.floor((Number(adults) || 2) / Math.max(1, bookedRooms.length))),
            children: Number(children) || 0,
            ratePerNight: rate,
            bedType: item.bedType,
          });
        }
      }
    } else {
      const resolvedRtId = resolveRoomTypeId({ roomTypeId }, roomTypeId);
      const numRooms = Number(roomCount) || 1;
      if (numRooms < 1) {
        return NextResponse.json(
          { error: "roomCount must be at least 1." },
          { status: 400 }
        );
      }
      const rate = Number(ratePerNight) >= 0 ? Number(ratePerNight) : 3500;
      for (let r = 0; r < numRooms; r++) {
        roomsToCreate.push({
          roomTypeId: resolvedRtId,
          adults: Number(adults) || 2,
          children: Number(children) || 0,
          ratePerNight: rate,
        });
      }
    }

    if (roomsToCreate.length === 0) {
      return NextResponse.json(
        { error: "At least one room must be booked." },
        { status: 400 }
      );
    }

    // 5. Verify room types exist and belong to property (prevent cross-property room types)
    const uniqueRoomTypeIds = Array.from(new Set(roomsToCreate.map((r) => r.roomTypeId)));
    const propertyRoomTypes = await prisma.roomType.findMany({
      where: {
        propertyId,
        id: { in: uniqueRoomTypeIds },
      },
    });

    if (propertyRoomTypes.length !== uniqueRoomTypeIds.length) {
      const foundIds = new Set(propertyRoomTypes.map((rt) => rt.id));
      const missingIds = uniqueRoomTypeIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        {
          error: `Room type(s) [${missingIds.join(", ")}] not found for property ${propertyId}.`,
          code: "ROOM_TYPE_NOT_FOUND",
        },
        { status: 400 }
      );
    }

    // 6. Verify assigned physical room if specified
    if (assignedRoomId) {
      const assignedRoom = await prisma.room.findUnique({
        where: { id: assignedRoomId },
        include: { roomState: true },
      });

      if (!assignedRoom || assignedRoom.propertyId !== propertyId) {
        return NextResponse.json(
          {
            error: "Assigned room does not belong to this property.",
            code: "CROSS_PROPERTY_ROOM",
          },
          { status: 400 }
        );
      }

      if (assignedRoom.roomTypeId !== roomsToCreate[0].roomTypeId) {
        return NextResponse.json(
          {
            error: `Assigned room type (${assignedRoom.roomTypeId}) does not match requested room type (${roomsToCreate[0].roomTypeId}).`,
            code: "ROOM_TYPE_MISMATCH",
          },
          { status: 400 }
        );
      }

      const sellStatus = assignedRoom.roomState?.sellabilityStatus || "SELLABLE";
      if (!assignedRoom.active || sellStatus === "OUT_OF_SERVICE" || sellStatus === "OUT_OF_ORDER") {
        return NextResponse.json(
          {
            error: `Assigned room is ${sellStatus} or inactive and cannot be booked.`,
            code: "ROOM_NOT_SELLABLE",
          },
          { status: 409 }
        );
      }

      const isFree = await isPhysicalRoomAvailable(
        assignedRoomId,
        effectiveArrival,
        effectiveDeparture,
        prisma
      );
      if (!isFree) {
        return NextResponse.json(
          {
            error: "Assigned room is not physically available for the requested stay interval.",
            code: "ROOM_NOT_AVAILABLE",
          },
          { status: 409 }
        );
      }
    }

    // 7. B2B metadata & guest normalization
    const b2bCompany = b2b?.companyName || companyName;
    const b2bAgent = b2b?.agentName || agencyName;
    const b2bAgentPhone = b2b?.agentPhone || agencyPhone;
    const b2bGstin = b2b?.companyGstin || guestGstin;
    const b2bPo = b2b?.poNumber;
    const b2bBillingInstruction = b2b?.billingInstruction;
    const effectiveSource = b2b?.accountType === "TRAVEL_AGENT"
      ? "TRAVEL_AGENT"
      : b2b?.accountType === "CORPORATE" || b2bCompany
      ? "CORPORATE"
      : source;

    const { pureName: canonicalGuestName } = normalizeGuestName(guestName);

    // Format channel and agency reference text
    const rawChannelRef = channelRef ? String(channelRef).trim() : null;
    const formattedChannelRef = b2bAgent
      ? `Agent: ${b2bAgent}${b2bAgentPhone ? ` (${b2bAgentPhone})` : ""}${rawChannelRef ? ` - Ref: ${rawChannelRef}` : ""}${b2b?.agentVoucherNo ? ` - Vch: ${b2b.agentVoucherNo}` : ""}`
      : b2bCompany
      ? `Corporate: ${b2bCompany}${b2bPo ? ` (PO: ${b2bPo})` : ""}${rawChannelRef ? ` - Ref: ${rawChannelRef}` : ""}`
      : rawChannelRef;

    // 8. Calculate pricing & schedules
    if (roomsToCreate.length * nightsCount > 10000) {
      return NextResponse.json({ error: "A booking request may contain at most 10000 room nights." }, { status: 400 });
    }

    let totalCalculatedGross = 0;
    const roomNightSchedules: { roomTypeId: string; adults: number; children: number; nightsData: any[] }[] = [];

    for (const rm of roomsToCreate) {
      const nightsData = [];
      for (const serviceDate of serviceDates) {
        const gst = quoteReservationNight(rm.ratePerNight, isRateInclusive, property.stateCode || "18");

        totalCalculatedGross += gst.totalAmount;

        nightsData.push({
          serviceDate,
          baseAmount: gst.taxableAmount,
          discountAmount: 0,
          taxableAmount: gst.taxableAmount,
          taxAmount: gst.taxAmount,
          totalAmount: gst.totalAmount,
          snapshotJson: JSON.stringify({ agreedRate: rm.ratePerNight, isRateInclusive, taxRate: gst.components.effectiveTaxRate }),
        });
      }

      roomNightSchedules.push({
        roomTypeId: rm.roomTypeId,
        adults: rm.adults,
        children: rm.children,
        nightsData,
      });
    }

    // The explicit tax choice uses the server-calculated quote. Older callers keep their existing contract.
    const finalTotal = body.isRateInclusive !== undefined
      ? round2(totalCalculatedGross)
      : totalAmount !== undefined ? Number(totalAmount) : round2(totalCalculatedGross);

    const fullNotes = [
      b2bAgent ? `Tour Agency: ${b2bAgent} (${b2bAgentPhone || "No direct phone"})` : "",
      b2bCompany ? `Corporate Client: ${b2bCompany}${b2bPo ? ` | PO: ${b2bPo}` : ""}` : "",
      b2bBillingInstruction ? `Billing: ${b2bBillingInstruction}` : "",
      roomNightSchedules.length > 1 ? `Group Booking: ${roomNightSchedules.length} Rooms x ${nightsCount} Nights` : "",
      promoCode ? `Promo Applied: ${promoCode} (Discount: ₹${discountAmount})` : "",
      effectiveNotes ? `Special Requests: ${effectiveNotes}` : "",
    ].filter(Boolean).join(" | ");

    let effectiveDepositAmount = Number(depositAmount) || 0;
    let effectiveDepositMethod = depositMethod || (paymentMethod === "RAZORPAY" ? "RAZORPAY" : "UPI");

    if (paymentMethod === "RAZORPAY" && effectiveDepositAmount === 0 && finalTotal > 0) {
      effectiveDepositAmount = finalTotal;
      effectiveDepositMethod = "RAZORPAY";
    }

    // 9. Transactional Execution with SQLite serialization and retry loop
    const maxRetries = 5;
    let attempt = 0;
    let transactionResult: {
      isReplay: boolean;
      existingReservation?: any;
      reservationId?: string;
      confirmationNo?: string;
    } | null = null;

    while (attempt < maxRetries) {
      try {
        transactionResult = await prisma.$transaction(async (tx) => {
          // A. SQLite Write Lock Serialization:
          // Immediately update property record to acquire an exclusive write lock in SQLite
          await tx.property.update({
            where: { id: propertyId },
            data: { updatedAt: new Date() },
          });

          // B. Idempotency Check inside transaction (handles concurrent replays)
          if (rawChannelRef || formattedChannelRef) {
            const matchRefFilter = [
              ...(rawChannelRef ? [{ channelRef: rawChannelRef }] : []),
              ...(formattedChannelRef && formattedChannelRef !== rawChannelRef ? [{ channelRef: formattedChannelRef }] : []),
            ];

            const existingTx = await tx.reservation.findFirst({
              where: {
                propertyId,
                OR: matchRefFilter,
              },
              include: {
                primaryGuest: true,
                rooms: {
                  include: {
                    nights: true,
                  },
                },
                deposits: true,
                notesHistory: true,
              },
            });

            if (existingTx) {
              const matchDates =
                existingTx.arrivalDate === effectiveArrival &&
                existingTx.departureDate === effectiveDeparture;
              const matchCount = existingTx.rooms.length === roomsToCreate.length;
              const matchGuest =
                (guestPhone && existingTx.primaryGuest.phone === guestPhone) ||
                existingTx.primaryGuest.name.toUpperCase() === canonicalGuestName.toUpperCase();

              const existingTypes = existingTx.rooms.map((r: any) => r.roomTypeId).sort().join(",");
              const requestedTypes = roomsToCreate.map((r: any) => r.roomTypeId).sort().join(",");
              const matchRooms = existingTypes === requestedTypes;

              const matchTaxTreatment = existingTx.rooms.every((room) =>
                (getReservationRateTerms(room)?.isRateInclusive ?? false) === isRateInclusive
              );
              if (matchDates && matchCount && matchGuest && matchRooms && matchTaxTreatment) {
                return { isReplay: true, existingReservation: existingTx };
              } else {
                const conflictErr: any = new Error("Conflict: channelRef already exists with different booking details.");
                conflictErr.statusCode = 409;
                conflictErr.code = "IDEMPOTENCY_CONFLICT";
                throw conflictErr;
              }
            }
          }

          // C. Re-check physical room availability inside transaction
          if (assignedRoomId) {
            const isFree = await isPhysicalRoomAvailable(
              assignedRoomId,
              effectiveArrival,
              effectiveDeparture,
              tx
            );
            if (!isFree) {
              const err: any = new Error("Assigned room is not physically available for the requested stay interval.");
              err.statusCode = 409;
              err.code = "ROOM_NOT_AVAILABLE";
              throw err;
            }
          }

          // D. Bottleneck date-aware inventory check per room type inside transaction
          const requestedCounts: Record<string, number> = {};
          for (const rm of roomsToCreate) {
            requestedCounts[rm.roomTypeId] = (requestedCounts[rm.roomTypeId] || 0) + 1;
          }

          const availabilityList = await calculateAvailability(propertyId, effectiveArrival, effectiveDeparture, tx);
          const availMap = new Map(availabilityList.map((a: any) => [a.roomTypeId, a.availableCount]));

          for (const [rtId, needed] of Object.entries(requestedCounts)) {
            const avail = availMap.get(rtId) ?? 0;
            if (avail < needed) {
              const err: any = new Error(
                `Insufficient inventory for room type ${rtId}. Requested ${needed}, available ${avail}.`
              );
              err.statusCode = 409;
              err.code = "CAPACITY_EXCEEDED";
              throw err;
            }
          }

          // E. Guest profile find or update within transaction
          let guest = guestPhone
            ? await tx.guest.findFirst({
                where: {
                  organizationId: property.organizationId,
                  phone: guestPhone,
                },
              })
            : null;

          const upperName = canonicalGuestName.toUpperCase();
          const upperCity = (guestCity || "").trim().toUpperCase();
          const upperState = (guestState || "").trim().toUpperCase();
          const upperNationality = (guestNationality || "Indian").trim().toUpperCase();
          const upperCompany = b2bCompany ? b2bCompany.trim().toUpperCase() : b2bAgent ? b2bAgent.trim().toUpperCase() : null;

          if (!guest) {
            guest = await tx.guest.create({
              data: {
                organizationId: property.organizationId,
                name: upperName,
                email: guestEmail || b2b?.corporateEmail || null,
                phone: guestPhone || null,
                gstin: b2bGstin ? b2bGstin.trim().toUpperCase() : null,
                companyName: upperCompany,
                nationality: upperNationality,
                addressJson: JSON.stringify({
                  city: upperCity,
                  state: upperState,
                  country: "India",
                }),
              },
            });
          } else {
            guest = await tx.guest.update({
              where: { id: guest.id },
              data: {
                name: upperName || guest.name,
                email: guestEmail || guest.email,
                gstin: b2bGstin ? b2bGstin.trim().toUpperCase() : guest.gstin,
                companyName: upperCompany || guest.companyName,
                nationality: upperNationality || guest.nationality,
                addressJson: (upperCity || upperState)
                  ? JSON.stringify({
                      city: upperCity,
                      state: upperState,
                      country: "India",
                    })
                  : guest.addressJson,
              },
            });
          }

          // F. Atomic sequence generation
          const seq = await getNextDocumentNumber(propertyId, "RESERVATION", "PROPERTY", tx);

          // G. Create Reservation
          const reservation = await tx.reservation.create({
            data: {
              organizationId: property.organizationId,
              propertyId,
              confirmationNo: seq.formattedNumber,
              primaryGuestId: guest.id,
              arrivalDate: effectiveArrival,
              departureDate: effectiveDeparture,
              status: "CONFIRMED",
              source: effectiveSource,
              channelRef: rawChannelRef || formattedChannelRef || null,
              notes: effectiveNotes || null,
              totalSnapshot: finalTotal,
            },
          });

          // H. Create ReservationRooms and ReservationNights
          for (let r = 0; r < roomNightSchedules.length; r++) {
            const schedule = roomNightSchedules[r];
            const resRoom = await tx.reservationRoom.create({
              data: {
                reservationId: reservation.id,
                roomTypeId: schedule.roomTypeId,
                assignedRoomId: r === 0 ? (assignedRoomId || null) : null,
                adults: schedule.adults,
                children: schedule.children,
                status: "CONFIRMED",
              },
            });

            for (const night of schedule.nightsData) {
              await tx.reservationNight.create({
                data: {
                  reservationRoomId: resRoom.id,
                  serviceDate: night.serviceDate,
                  baseAmount: night.baseAmount,
                  taxableAmount: night.taxableAmount,
                  taxAmount: night.taxAmount,
                  totalAmount: night.totalAmount,
                  snapshotJson: night.snapshotJson,
                },
              });
            }
          }

          // I. Reservation Note
          if (fullNotes) {
            await tx.reservationNote.create({
              data: {
                reservationId: reservation.id,
                category: "SPECIAL_REQUEST",
                text: fullNotes,
                visibility: "INTERNAL",
              },
            });
          }

          // J. Deposit & Payment
          if (effectiveDepositAmount > 0) {
            const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT", "PROPERTY", tx);
            const payment = await tx.payment.create({
              data: {
                organizationId: property.organizationId,
                propertyId,
                receiptNo: recSeq.formattedNumber,
                reservationId: reservation.id,
                reference: `Reservation advance ${reservation.confirmationNo}`,
                payerSnapshot: JSON.stringify({ name: guest.name, phone: guest.phone, companyName: guest.companyName, gstin: guest.gstin, reservationNo: reservation.confirmationNo, checkInDate: effectiveArrival, checkOutDate: effectiveDeparture, category: "ADVANCE_DEPOSIT" }),
                createdById: getApiAccess(request).user.id,
                amount: effectiveDepositAmount,
                method: effectiveDepositMethod,
                status: "SUCCEEDED",
              },
            });

            await tx.deposit.create({
              data: {
                organizationId: property.organizationId,
                propertyId,
                reservationId: reservation.id,
                paymentId: payment.id,
                originalAmount: effectiveDepositAmount,
                availableAmount: effectiveDepositAmount,
                status: "AVAILABLE",
              },
            });
          }

          return {
            isReplay: false,
            reservationId: reservation.id,
            confirmationNo: reservation.confirmationNo,
          };
        }, {
          timeout: 10000,
        });

        break;
      } catch (err: any) {
        if (err.statusCode) {
          // Explicit business or validation error (400, 404, 409) - fail immediately without retry!
          return NextResponse.json(
            { error: err.message, code: err.code || "REQUEST_FAILED" },
            { status: err.statusCode }
          );
        }

        const isBusy =
          err.code === "P2034" ||
          (err.message && (
            err.message.includes("database is locked") ||
            err.message.includes("SQLITE_BUSY") ||
            err.message.includes("timed out")
          ));

        if (isBusy && attempt < maxRetries - 1) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 40 + Math.random() * 60));
          continue;
        }

        throw err;
      }
    }

    if (!transactionResult) {
      return NextResponse.json({ error: "Booking transaction failed to complete." }, { status: 500 });
    }

    // 10. Return Idempotent Replay if matched
    if (transactionResult.isReplay && transactionResult.existingReservation) {
      const existing = transactionResult.existingReservation;
      const firstRoom = existing.rooms[0];
      const rt = firstRoom
        ? await prisma.roomType.findUnique({ where: { id: firstRoom.roomTypeId } })
        : null;

      const enriched = {
        ...existing,
        roomType: rt,
        roomTypeName: rt?.name || "Standard Room",
        roomTypeCode: rt?.code || "STD",
        adults: firstRoom?.adults ?? 2,
        children: firstRoom?.children ?? 0,
        roomCount: existing.rooms.length || 1,
      };

      return NextResponse.json({
        success: true,
        reservation: enriched,
        confirmationNo: existing.confirmationNo,
        totalAmount: existing.totalSnapshot,
        idempotentReplay: true,
      });
    }

    // 11. Retrieve fully enriched newly created reservation
    const fullReservation = await prisma.reservation.findUnique({
      where: { id: transactionResult.reservationId },
      include: {
        primaryGuest: true,
        rooms: {
          include: {
            nights: true,
          },
        },
        deposits: true,
        notesHistory: true,
      },
    });

    const firstRoomType = fullReservation?.rooms?.[0]?.roomTypeId
      ? await prisma.roomType.findUnique({
          where: { id: fullReservation.rooms[0].roomTypeId },
        })
      : null;

    const enrichedReservation = {
      ...fullReservation,
      roomType: firstRoomType,
      roomTypeName: firstRoomType?.name || "Standard Room",
      roomTypeCode: firstRoomType?.code || "STD",
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      roomCount: fullReservation?.rooms?.length || 1,
    };

    // Audit log
    await logAuditEvent({
      organizationId: property.organizationId,
      propertyId,
      actorName: "Staff / Reservations",
      action: "RESERVATION_CREATE",
      targetType: "RESERVATION",
      targetId: transactionResult.reservationId!,
      reason: `Reservation ${transactionResult.confirmationNo} created for ${guestName}`,
      afterJson: {
        confirmationNo: transactionResult.confirmationNo,
        guestName,
        guestPhone,
        roomCount: fullReservation?.rooms?.length || 1,
        nights: nightsCount,
        arrivalDate: effectiveArrival,
        departureDate: effectiveDeparture,
        totalAmount: finalTotal,
        depositAmount: effectiveDepositAmount,
        source: effectiveSource,
        bookingType,
      },
    });

    return NextResponse.json({
      success: true,
      reservation: enrichedReservation,
      confirmationNo: transactionResult.confirmationNo,
      totalAmount: finalTotal,
    });
  } catch (error: any) {
    if (error instanceof DateValidationError) {
      return NextResponse.json(
        { error: error.message, code: "INVALID_DATE_INTERVAL" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;
  try {
    const { id, status, reason, assignedRoomId } = await request.json();
    if (typeof id !== "string" || !id) return NextResponse.json({ error: "Reservation ID is required." }, { status: 400 });
    const editableStatuses = ["DRAFT", "TENTATIVE", "CONFIRMED", "CANCELLED", "NO_SHOW"];
    if (status !== undefined && !editableStatuses.includes(status)) return NextResponse.json({ error: "Use the check-in/checkout workflow for stay state changes." }, { status: 400 });
    const { user, property } = getApiAccess(request);
    const consumesInventory = (value: string) => ["DRAFT", "TENTATIVE", "CONFIRMED", "PARTIALLY_CHECKED_IN"].includes(value);
    const result = await prisma.$transaction(async (tx) => {
      // Acquire the same persistent SQLite writer lock as booking confirmation.
      await tx.property.update({ where: { id: property.id }, data: { updatedAt: new Date() } });
      const existing = await tx.reservation.findUnique({ where: { id }, include: { rooms: true } });
      const failure = (message: string, statusCode: number): never => { throw Object.assign(new Error(message), { statusCode }); };
      if (!existing || existing.propertyId !== property.id) return failure("Reservation not found.", 404);
      const activeStays = await tx.stay.count({ where: { reservationRoomId: { in: existing.rooms.map(room => room.id) }, status: { in: ["IN_HOUSE", "DUE_IN"] } } });
      if (activeStays || ["CHECKED_IN", "PARTIALLY_CHECKED_IN", "COMPLETED"].includes(existing.status)) return failure("Use the stay workflow to change a checked-in or completed booking.", 409);
      const nextStatus = status || existing.status;
      validateStayInterval(existing.arrivalDate, existing.departureDate);
      const needed: Record<string, number> = {};
      if (consumesInventory(nextStatus)) {
        for (const room of existing.rooms) {
          const alreadyHeld = consumesInventory(existing.status) && ["CONFIRMED", "HELD"].includes(room.status);
          if (!alreadyHeld) needed[room.roomTypeId] = (needed[room.roomTypeId] || 0) + 1;
        }
      }
      if (Object.keys(needed).length) {
        const inventory = await calculateAvailability(property.id, existing.arrivalDate, existing.departureDate, tx);
        for (const [roomTypeId, count] of Object.entries(needed)) {
          if ((inventory.find(row => row.roomTypeId === roomTypeId)?.availableCount || 0) < count) return failure("This booking cannot be confirmed: room inventory is sold out.", 409);
        }
      }
      if (assignedRoomId !== undefined && assignedRoomId !== null) {
        if (typeof assignedRoomId !== "string" || !assignedRoomId) return failure("Invalid assigned room.", 400);
        if (existing.rooms.length !== 1) return failure("Assign each room of a multi-room booking individually; one room cannot hold the whole booking.", 400);
        const room = await tx.room.findUnique({ where: { id: assignedRoomId }, include: { roomState: true } });
        if (!room || room.propertyId !== property.id || room.roomTypeId !== existing.rooms[0].roomTypeId || !room.active) return failure("Assigned room must be active and match the booking's property and room type.", 400);
        if (!await isPhysicalRoomAvailable(room.id, existing.arrivalDate, existing.departureDate, tx, existing.id)) return failure("Assigned room is not available for these dates.", 409);
      }
      const updated = await tx.reservation.update({ where: { id }, data: { ...(status ? { status } : {}) } });
      if (status || assignedRoomId !== undefined) {
        const roomStatus = status === "DRAFT" || status === "TENTATIVE" ? "HELD" : status;
        await tx.reservationRoom.updateMany({ where: { reservationId: id }, data: { ...(roomStatus ? { status: roomStatus } : {}), ...(assignedRoomId !== undefined ? { assignedRoomId } : {}) } });
      }
      if (reason) await tx.reservationNote.create({ data: { reservationId: id, category: "FRONT_DESK", text: `Status updated to ${nextStatus}. Reason: ${reason}`, visibility: "INTERNAL", authorId: user.id } });
      await tx.auditLog.create({ data: { organizationId: property.organizationId, propertyId: property.id, actorId: user.id, actorName: user.name, action: nextStatus === "CANCELLED" ? "RESERVATION_CANCEL" : "RESERVATION_STATUS_CHANGE", targetType: "RESERVATION", targetId: id, reason: reason || `Status ${existing.status} to ${nextStatus}`, beforeJson: JSON.stringify({ status: existing.status }), afterJson: JSON.stringify({ status: nextStatus, assignedRoomId }) } });
      return updated;
    });
    return NextResponse.json({ success: true, reservation: result });
  } catch (error: any) {
    if (error instanceof DateValidationError || error.statusCode) return NextResponse.json({ error: error.message }, { status: error.statusCode || 400 });
    if (error.code === "P1008" || error.code === "P2028" || /database is locked|SQLITE_BUSY/i.test(error.message || "")) return NextResponse.json({ error: "Booking inventory is busy. Please retry." }, { status: 503, headers: { "Retry-After": "1" } });
    return NextResponse.json({ error: "Reservation update failed." }, { status: 500 });
  }
}
