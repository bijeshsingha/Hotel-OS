import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      const defaultProperty = await prisma.property.findFirst({
        where: { code: "GUW-01" },
      });
      propertyId = defaultProperty?.id || "";
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        outlets: {
          include: {
            categories: {
              where: { active: true },
              orderBy: { sortOrder: "asc" },
              include: {
                items: {
                  where: { active: true },
                  include: {
                    variants: { where: { active: true } },
                  },
                },
              },
            },
          },
        },
        rooms: {
          where: { active: true },
          include: {
            roomType: true,
            assignments: {
              where: { endsAt: null },
              include: {
                stay: {
                  include: {
                    primaryGuest: true,
                    folio: {
                      include: {
                        windows: {
                          include: { entries: true },
                        },
                        payments: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { number: "asc" },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Determine current Indian time (Asia/Kolkata)
    const now = new Date();
    const kolkataTimeString = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [currentHour, currentMinute] = kolkataTimeString.split(":").map(Number);
    const currentTimeVal = currentHour * 60 + currentMinute;

    // Timing windows:
    // Breakfast: 08:00 (480) - 11:00 (660)
    // A La Carte: 12:00 (720) - 22:45 (1365)
    const isBreakfastActive = currentTimeVal >= 480 && currentTimeVal <= 660;
    const isALaCarteActive = currentTimeVal >= 720 && currentTimeVal <= 1365;

    let activeService = "CLOSED";
    let serviceMessage = "Kitchen Closed. Pre-orders available for next service.";
    let nextServiceOpens = "08:00 AM";

    if (isBreakfastActive) {
      activeService = "BREAKFAST";
      serviceMessage = "Breakfast Service Live (8:00 AM – 11:00 AM)";
    } else if (isALaCarteActive) {
      activeService = "A_LA_CARTE";
      serviceMessage = "À La Carte Dining Live (12:00 PM – 10:45 PM)";
    } else if (currentTimeVal < 480) {
      nextServiceOpens = "08:00 AM";
      serviceMessage = "Breakfast starts at 08:00 AM";
    } else if (currentTimeVal > 660 && currentTimeVal < 720) {
      nextServiceOpens = "12:00 PM";
      serviceMessage = "À La Carte Lunch opens at 12:00 PM";
    } else {
      nextServiceOpens = "08:00 AM (Tomorrow)";
      serviceMessage = "Kitchen Closed for the night. Opens at 08:00 AM.";
    }

    const outlet = property.outlets[0];

    // Build rich room list with active in-house stay and folio details
    const inHouseRooms = property.rooms.map((r) => {
      const activeAssignment = r.assignments[0];
      const stay = activeAssignment?.stay;
      const guest = stay?.primaryGuest;
      const folio = stay?.folio;

      const totalCharges =
        folio?.windows?.flatMap((w) => w.entries).reduce((sum, e) => sum + e.totalAmount, 0) || 0;
      const totalPayments =
        folio?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const currentFolioBalance = Math.round((totalCharges - totalPayments) * 100) / 100;

      return {
        id: r.id,
        number: r.number,
        floor: r.floor,
        roomTypeName: r.roomType?.name || "Standard Room",
        stayId: stay?.id || null,
        folioId: folio?.id || null,
        guestName: guest?.name || null,
        guestPhone: guest?.phone || null,
        isOccupied: !!activeAssignment && stay?.status === "IN_HOUSE",
        currentFolioBalance,
      };
    });

    return NextResponse.json({
      property: {
        id: property.id,
        name: property.displayName || "Hotel Ambarish Grand Residency",
        legalName: property.legalName,
        address: property.address || "M.D. Shah Road, Paltan Bazar, Guwahati, Assam",
        phone: property.phone || "+91 69017 41211",
        email: property.email || "reservation.ambarish@gmail.com",
        receptionExtension: "555",
        roomServiceExtension: "9",
      },
      timeStatus: {
        kolkataTime: kolkataTimeString,
        isBreakfastActive,
        isALaCarteActive,
        activeService,
        serviceMessage,
        nextServiceOpens,
        prepTimeMinutes: 40,
      },
      outlet: {
        id: outlet?.id,
        name: outlet?.name,
        categories: outlet?.categories || [],
      },
      rooms: inHouseRooms,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
