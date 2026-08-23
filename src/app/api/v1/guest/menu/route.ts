import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyParam =
      searchParams.get("property") ||
      searchParams.get("propertyCode") ||
      searchParams.get("code") ||
      searchParams.get("propertyId");

    const allProperties = await prisma.property.findMany({
      select: { id: true, code: true, displayName: true, legalName: true, address: true, phone: true, email: true },
      orderBy: { createdAt: "asc" },
    });

    let matchedProperty = null;
    if (propertyParam) {
      const cleanParam = propertyParam.trim().toUpperCase();
      matchedProperty = allProperties.find(
        (p) => p.id === propertyParam || p.code?.toUpperCase() === cleanParam
      );
    }
    if (!matchedProperty) {
      matchedProperty = allProperties.find((p) => p.code === "GUW-01") || allProperties[0];
    }
    const propertyId = matchedProperty?.id || "";

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

    // Always ensure shared restaurant menu from Ambarish Restaurant
    let outlet = property.outlets[0];
    let categories = outlet?.categories || [];

    if (categories.length === 0) {
      const fallbackOutlet = await prisma.outlet.findFirst({
        where: { name: { contains: "Ambarish Restaurant" } },
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
      });
      if (fallbackOutlet) {
        outlet = fallbackOutlet as any;
        categories = fallbackOutlet.categories;
      }
    }

    // 1. Build room list for current property
    const currentPropertyRooms = property.rooms.map((r) => {
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
        propertyId: property.id,
        propertyName: property.displayName,
        stayId: stay?.id || null,
        folioId: folio?.id || null,
        guestName: guest?.name || null,
        guestPhone: guest?.phone || null,
        isOccupied: !!activeAssignment && stay?.status === "IN_HOUSE",
        currentFolioBalance,
      };
    });

    // 2. Fetch all other active in-house assignments across the entire shared restaurant ecosystem
    const otherOccupiedAssignments = await prisma.roomAssignment.findMany({
      where: {
        endsAt: null,
        stay: { status: "IN_HOUSE" },
        room: { propertyId: { not: property.id } },
      },
      include: {
        room: {
          include: {
            property: true,
            roomType: true,
          },
        },
        stay: {
          include: {
            primaryGuest: true,
            folio: {
              include: {
                windows: { include: { entries: true } },
                payments: true,
              },
            },
          },
        },
      },
    });

    const otherOccupiedRooms = otherOccupiedAssignments.map((a) => {
      const r = a.room;
      const stay = a.stay;
      const guest = stay.primaryGuest;
      const folio = stay.folio;

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
        propertyId: r.propertyId,
        propertyName: r.property?.displayName || "Partner Hotel",
        stayId: stay.id,
        folioId: folio?.id || null,
        guestName: guest?.name || null,
        guestPhone: guest?.phone || null,
        isOccupied: true,
        currentFolioBalance,
      };
    });

    // Combine current property rooms with other occupied rooms so guest lookup always resolves
    const inHouseRooms = [...currentPropertyRooms, ...otherOccupiedRooms];

    return NextResponse.json({
      property: {
        id: property.id,
        code: property.code,
        displayName: property.displayName || property.legalName || "Hotel Ambarish Grand Residency",
        name: property.displayName || property.legalName || "Hotel Ambarish Grand Residency",
        legalName: property.legalName,
        address: property.address || "M.D. Shah Road, Paltan Bazar, Guwahati, Assam",
        phone: property.phone || "+91 69017 41211",
        email: property.email || "reservation.ambarish@gmail.com",
        receptionExtension: "555",
        roomServiceExtension: "9",
      },
      allProperties,
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
        name: "Ambarish Restaurant & Room Dining",
        description: "Shared culinary kitchen serving Hotel Ambarish & Hotel Divine View",
        categories: categories,
      },
      rooms: inHouseRooms,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
