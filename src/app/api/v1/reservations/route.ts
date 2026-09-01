import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { quoteStay } from "@/lib/domain/pms-service";
import { calculateGST } from "@/lib/gst/calculator";
import { normalizeGuestName } from "@/lib/domain/name-utils";

export async function GET(request: Request) {
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

    // Also enrich with room types for quick client rendering
    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId },
    });
    const rtMap = new Map(roomTypes.map((rt) => [rt.id, rt]));

    const enriched = reservations.map((res) => {
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

export async function POST(request: Request) {
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

    // 1. Resolve Aliased Fields
    const effectiveArrival = arrivalDate || checkIn;
    const effectiveDeparture = departureDate || checkOut;
    const effectiveNotes = notes || specialRequests || "";

    if (!propertyId) {
      const prop = await prisma.property.findFirst();
      propertyId = prop?.id || "prop_ambarish";
    }

    if (!effectiveArrival || !effectiveDeparture || !guestName) {
      return NextResponse.json(
        { error: "Guest Name, Check-In Date, and Check-Out Date are required." },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });

    // 2. Extract B2B Metadata if present
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

    // 3. Find or create Guest strictly by phone number
    let guest = guestPhone
      ? await prisma.guest.findFirst({
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
      guest = await prisma.guest.create({
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
      // If guest profile found by phone number, update with latest entered guest name and details
      guest = await prisma.guest.update({
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

    // 4. Calculate Nights Count
    const start = new Date(effectiveArrival);
    const end = new Date(effectiveDeparture);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 5. Multi-Room Breakdown Handling
    interface NormalizedRoomItem {
      roomTypeId: string;
      adults: number;
      children: number;
      ratePerNight: number;
      bedType?: string;
    }

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
      const numRooms = Math.max(1, Number(roomCount) || 1);
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

    // 6. Calculate per-night rates & total per room
    let totalCalculatedGross = 0;
    const roomNightSchedules: { roomTypeId: string; adults: number; children: number; nightsData: any[] }[] = [];

    for (const rm of roomsToCreate) {
      const nightsData = [];
      for (let i = 0; i < nightsCount; i++) {
        const current = new Date(start);
        current.setDate(current.getDate() + i);
        const serviceDate = current.toISOString().split("T")[0];

        const gst = rm.ratePerNight === 0
          ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0 }
          : calculateGST({
              grossOrBaseAmount: rm.ratePerNight,
              isInclusive: false,
              sacHsn: "996311",
              supplierStateCode: property.stateCode || "18",
            });

        totalCalculatedGross += gst.totalAmount;

        nightsData.push({
          serviceDate,
          baseAmount: rm.ratePerNight,
          discountAmount: 0,
          taxableAmount: gst.taxableAmount,
          taxAmount: gst.taxAmount,
          totalAmount: gst.totalAmount,
        });
      }

      roomNightSchedules.push({
        roomTypeId: rm.roomTypeId,
        adults: rm.adults,
        children: rm.children,
        nightsData,
      });
    }

    const finalTotal = totalAmount ? Number(totalAmount) : totalCalculatedGross;

    // 7. Document sequence for confirmation number
    const seq = await getNextDocumentNumber(propertyId, "RESERVATION");

    // Format channel and agency reference text
    const formattedChannelRef = b2bAgent
      ? `Agent: ${b2bAgent}${b2bAgentPhone ? ` (${b2bAgentPhone})` : ""}${channelRef ? ` - Ref: ${channelRef}` : ""}${b2b?.agentVoucherNo ? ` - Vch: ${b2b.agentVoucherNo}` : ""}`
      : b2bCompany
      ? `Corporate: ${b2bCompany}${b2bPo ? ` (PO: ${b2bPo})` : ""}${channelRef ? ` - Ref: ${channelRef}` : ""}`
      : channelRef || null;

    // 8. Create Reservation & Room Allocations
    const reservation = await prisma.reservation.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        confirmationNo: seq.formattedNumber,
        primaryGuestId: guest.id,
        arrivalDate: effectiveArrival,
        departureDate: effectiveDeparture,
        status: "CONFIRMED",
        source: effectiveSource,
        channelRef: formattedChannelRef,
        notes: effectiveNotes || null,
        totalSnapshot: finalTotal,
      },
    });

    // Create ReservationRoom for each booked room in the reservation
    for (let r = 0; r < roomNightSchedules.length; r++) {
      const schedule = roomNightSchedules[r];
      const resRoom = await prisma.reservationRoom.create({
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
        await prisma.reservationNight.create({
          data: {
            reservationRoomId: resRoom.id,
            serviceDate: night.serviceDate,
            baseAmount: night.baseAmount,
            taxableAmount: night.taxableAmount,
            taxAmount: night.taxAmount,
            totalAmount: night.totalAmount,
          },
        });
      }
    }

    // Add note history if provided or if B2B details exist
    const fullNotes = [
      b2bAgent ? `Tour Agency: ${b2bAgent} (${b2bAgentPhone || "No direct phone"})` : "",
      b2bCompany ? `Corporate Client: ${b2bCompany}${b2bPo ? ` | PO: ${b2bPo}` : ""}` : "",
      b2bBillingInstruction ? `Billing: ${b2bBillingInstruction}` : "",
      roomNightSchedules.length > 1 ? `Group Booking: ${roomNightSchedules.length} Rooms x ${nightsCount} Nights` : "",
      promoCode ? `Promo Applied: ${promoCode} (Discount: ₹${discountAmount})` : "",
      effectiveNotes ? `Special Requests: ${effectiveNotes}` : "",
    ].filter(Boolean).join(" | ");

    if (fullNotes) {
      await prisma.reservationNote.create({
        data: {
          reservationId: reservation.id,
          category: "SPECIAL_REQUEST",
          text: fullNotes,
          visibility: "INTERNAL",
        },
      });
    }

    // 9. Deposit / Payment Resolution
    let effectiveDepositAmount = Number(depositAmount) || 0;
    let effectiveDepositMethod = depositMethod || (paymentMethod === "RAZORPAY" ? "RAZORPAY" : "UPI");

    if (paymentMethod === "RAZORPAY" && effectiveDepositAmount === 0 && finalTotal > 0) {
      effectiveDepositAmount = finalTotal;
      effectiveDepositMethod = "RAZORPAY";
    }

    if (effectiveDepositAmount > 0) {
      const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT");
      const payment = await prisma.payment.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          receiptNo: recSeq.formattedNumber,
          reservationId: reservation.id,
          amount: effectiveDepositAmount,
          method: effectiveDepositMethod,
          status: "SUCCEEDED",
        },
      });

      await prisma.deposit.create({
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

    // 10. Query fully enriched reservation for client voucher & state
    const fullReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
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

    return NextResponse.json({
      success: true,
      reservation: enrichedReservation,
      confirmationNo: reservation.confirmationNo,
      totalAmount: finalTotal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reason, assignedRoomId } = body;

    if (!id) {
      return NextResponse.json({ error: "Reservation ID is required." }, { status: 400 });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
      },
    });

    if (status) {
      await prisma.reservationRoom.updateMany({
        where: { reservationId: id },
        data: {
          status,
          ...(assignedRoomId ? { assignedRoomId } : {}),
        },
      });
    }

    if (reason) {
      await prisma.reservationNote.create({
        data: {
          reservationId: id,
          category: "FRONT_DESK",
          text: `Status updated to ${status}. Reason: ${reason}`,
          visibility: "INTERNAL",
        },
      });
    }

    return NextResponse.json({ success: true, reservation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
