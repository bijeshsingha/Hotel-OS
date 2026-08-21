import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { quoteStay } from "@/lib/domain/pms-service";

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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reservations);
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
      guestNationality = "Indian",
      roomTypeId,
      arrivalDate,
      departureDate,
      adults = 2,
      children = 0,
      source = "DIRECT",
      depositAmount = 0,
    } = body;

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
          email: guestEmail,
          phone: guestPhone,
          gstin: guestGstin,
          nationality: guestNationality,
        },
      });
    }

    // 2. Quote stay to calculate snapshot
    const quote = await quoteStay({
      propertyId,
      roomTypeId,
      arrivalDate,
      departureDate,
      adults,
      children,
    });

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
        totalSnapshot: quote.totalAmount,
      },
    });

    const resRoom = await prisma.reservationRoom.create({
      data: {
        reservationId: reservation.id,
        roomTypeId,
        adults,
        children,
        status: "CONFIRMED",
      },
    });

    for (const night of quote.nights) {
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

    // Record Deposit if provided
    if (depositAmount > 0) {
      const recSeq = await getNextDocumentNumber(propertyId, "RECEIPT");
      const payment = await prisma.payment.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          receiptNo: recSeq.formattedNumber,
          reservationId: reservation.id,
          amount: depositAmount,
          method: "UPI",
          status: "SUCCEEDED",
        },
      });

      await prisma.deposit.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          reservationId: reservation.id,
          paymentId: payment.id,
          originalAmount: depositAmount,
          availableAmount: depositAmount,
          status: "AVAILABLE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      reservation,
      confirmationNo: reservation.confirmationNo,
      quote,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
