import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawProp =
      searchParams.get("propertyId") ||
      searchParams.get("property") ||
      searchParams.get("propertyCode") ||
      searchParams.get("code");
    const status = searchParams.get("status"); // IN_HOUSE, CHECKED_OUT, DUE_IN, DUE_OUT

    let targetPropertyId = rawProp;

    // Resolve property if ID or Code is provided
    if (rawProp) {
      const prop = await prisma.property.findFirst({
        where: {
          OR: [
            { id: rawProp },
            { code: { equals: rawProp } },
            { displayName: { contains: rawProp } },
          ],
        },
      });
      if (prop) {
        targetPropertyId = prop.id;
      }
    } else {
      // Default to the first active property
      const defaultProp = await prisma.property.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
      targetPropertyId = defaultProp?.id || null;
    }

    if (!targetPropertyId) {
      return NextResponse.json([]);
    }

    const stays = await prisma.stay.findMany({
      where: {
        propertyId: targetPropertyId,
        ...(status ? { status } : {}),
      },
      include: {
        primaryGuest: true,
        roomAssignments: {
          include: {
            room: {
              include: { roomType: true },
            },
          },
          orderBy: { startsAt: "desc" },
        },
        folio: {
          include: {
            windows: {
              include: {
                entries: true,
                invoices: {
                  include: { lines: true },
                },
              },
            },
            payments: true,
          },
        },
      },
      orderBy: { arrivalAt: "desc" },
    });

    const enrichedStays = await Promise.all(
      stays.map(async (stay) => {
        const grc = await prisma.guestRegistration.findFirst({
          where: {
            OR: [
              { stayId: stay.id },
              { guestId: stay.primaryGuestId, status: stay.status === "IN_HOUSE" ? "CHECKED_IN" : "CHECKED_OUT" },
            ],
          },
          select: {
            id: true,
            registrationNo: true,
            signedAt: true,
            preAssignedRoom: true,
            arrivalDateTime: true,
            expectedDepartureDate: true,
            depositAmount: true,
            status: true,
          },
          orderBy: { signedAt: "desc" },
        });

        return {
          ...stay,
          guestRegistration: grc || null,
        };
      })
    );

    return NextResponse.json(enrichedStays);
  } catch (error: any) {
    console.error("Error in /api/v1/stays:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
