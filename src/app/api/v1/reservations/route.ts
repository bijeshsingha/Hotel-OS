import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { quoteStay } from "@/lib/domain/pms-service";
import { calculateGST } from "@/lib/gst/calculator";

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
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      guestName,
      guestPhone,
      guestEmail,
      guestGstin,
      guestCity,
      guestState,
      guestNationality = "Indian",
      roomTypeId,
      assignedRoomId,
      arrivalDate,
      departureDate,
      adults = 2,
      children = 0,
      source = "DIRECT",
      channelRef,
      ratePerNight,
      depositAmount = 0,
      depositMethod = "UPI",
      notes,
    } = body;

    if (!propertyId || !guestName || !roomTypeId || !arrivalDate || !departureDate) {
      return NextResponse.json(
        { error: "Property, Guest Name, Room Category, Check-In Date, and Check-Out Date are required." },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });

    // 1. Find or create Guest
    let guest = await prisma.guest.findFirst({
      where: {
        organizationId: property.organizationId,
        OR: [
          ...(guestEmail ? [{ email: guestEmail }] : []),
          ...(guestPhone ? [{ phone: guestPhone }] : []),
        ],
      },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          organizationId: property.organizationId,
          name: guestName,
          email: guestEmail || null,
          phone: guestPhone || null,
          gstin: guestGstin || null,
          nationality: guestNationality,
          addressJson: JSON.stringify({
            city: guestCity || "",
            state: guestState || "",
            country: "India",
          }),
        },
      });
    }

    // Calculate nights count
    const start = new Date(arrivalDate);
    const end = new Date(departureDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Calculate per-night rates & total
    const effectiveBaseRate = Number(ratePerNight) > 0 ? Number(ratePerNight) : 3500;
    const nightsData = [];
    let calculatedTotal = 0;

    for (let i = 0; i < nightsCount; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      const serviceDate = current.toISOString().split("T")[0];

      const gst = calculateGST({
        grossOrBaseAmount: effectiveBaseRate,
        isInclusive: false,
        sacHsn: "996311",
        supplierStateCode: property.stateCode || "18",
      });

      calculatedTotal += gst.totalAmount;

      nightsData.push({
        serviceDate,
        baseAmount: effectiveBaseRate,
        discountAmount: 0,
        taxableAmount: gst.taxableAmount,
        taxAmount: gst.taxAmount,
        totalAmount: gst.totalAmount,
      });
    }

    // 3. Document sequence for confirmation number
    const seq = await getNextDocumentNumber(propertyId, "RESERVATION");

    // 4. Create Reservation & Allocation
    const reservation = await prisma.reservation.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        confirmationNo: seq.formattedNumber,
        primaryGuestId: guest.id,
        arrivalDate,
        departureDate,
        status: "CONFIRMED",
        source,
        channelRef: channelRef || null,
        notes: notes || null,
        totalSnapshot: calculatedTotal,
      },
    });

    const resRoom = await prisma.reservationRoom.create({
      data: {
        reservationId: reservation.id,
        roomTypeId,
        assignedRoomId: assignedRoomId || null,
        adults: Number(adults) || 2,
        children: Number(children) || 0,
        status: "CONFIRMED",
      },
    });

    for (const night of nightsData) {
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

    // Add note history if provided
    if (notes) {
      await prisma.reservationNote.create({
        data: {
          reservationId: reservation.id,
          category: "SPECIAL_REQUEST",
          text: notes,
          visibility: "INTERNAL",
        },
      });
    }

    // Record Deposit if provided
    if (Number(depositAmount) > 0) {
      const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT");
      const payment = await prisma.payment.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          receiptNo: recSeq.formattedNumber,
          reservationId: reservation.id,
          amount: Number(depositAmount),
          method: depositMethod || "UPI",
          status: "SUCCEEDED",
        },
      });

      await prisma.deposit.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          reservationId: reservation.id,
          paymentId: payment.id,
          originalAmount: Number(depositAmount),
          availableAmount: Number(depositAmount),
          status: "AVAILABLE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      reservation,
      confirmationNo: reservation.confirmationNo,
      totalAmount: calculatedTotal,
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
