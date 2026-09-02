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
      select: { id: true, code: true, displayName: true, legalName: true, address: true, phone: true, stateCode: true },
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
            tables: { where: { active: true }, orderBy: { name: "asc" } },
            kitchenStations: { where: { active: true } },
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
                        windows: { include: { entries: true } },
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

    const outlet = property.outlets[0] || null;

    // Format categories and menu items
    const categories: any[] = [];
    const allItems: any[] = [];

    if (outlet?.categories) {
      for (const cat of outlet.categories) {
        categories.push({
          id: cat.id,
          name: cat.name,
          servicePeriod: cat.servicePeriod,
          sortOrder: cat.sortOrder,
          itemsCount: cat.items.length,
        });

        for (const item of cat.items) {
          const defaultVariant = item.variants[0];
          allItems.push({
            id: item.id,
            categoryId: cat.id,
            categoryName: cat.name,
            code: item.code,
            name: item.name,
            description: item.description,
            portionSize: item.portionSize || "Standard",
            isVeg: item.isVeg,
            servicePeriod: item.servicePeriod,
            prepTimeMinutes: item.prepTimeMinutes || 20,
            tags: item.tags,
            variants: item.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stationId: v.stationId,
            })),
            price: defaultVariant?.price || 250,
            defaultVariantId: defaultVariant?.id,
            stationId: defaultVariant?.stationId,
          });
        }
      }
    }

    // Format rooms with live occupancy & stay information
    const rooms = property.rooms.map((room) => {
      const activeAssign = room.assignments[0];
      const stay = activeAssign?.stay;
      const guest = stay?.primaryGuest;
      const folio = stay?.folio;

      let folioBalance = 0;
      if (folio) {
        const totalCharges = (folio.windows?.[0]?.entries || []).reduce(
          (sum, e) => sum + (e.type === "CHARGE" ? e.totalAmount : -e.totalAmount),
          0
        );
        const totalPayments = (folio.payments || []).reduce((sum, p) => sum + p.amount, 0);
        folioBalance = Math.round((totalCharges - totalPayments) * 100) / 100;
      }

      return {
        id: room.id,
        number: room.number,
        floor: room.floor,
        roomType: room.roomType?.name || "Standard",
        isOccupied: Boolean(activeAssign && stay?.status === "IN_HOUSE"),
        stayId: stay?.id || null,
        guestName: guest?.name || null,
        guestPhone: guest?.phone || null,
        folioId: folio?.id || null,
        folioBalance: folioBalance,
      };
    });

    // Format dining tables (fallback to default standard tables if none created in DB)
    let tables: any[] = (outlet?.tables || []).map((t) => ({
      id: t.id,
      name: t.name,
      section: t.section || "Main Dining",
      capacity: t.capacity || 4,
    }));

    if (tables.length === 0) {
      tables = [
        { id: "tbl_1", name: "Table 1", section: "Main Hall", capacity: 2 },
        { id: "tbl_2", name: "Table 2", section: "Main Hall", capacity: 4 },
        { id: "tbl_3", name: "Table 3", section: "Main Hall", capacity: 4 },
        { id: "tbl_4", name: "Table 4", section: "Main Hall", capacity: 4 },
        { id: "tbl_5", name: "Table 5", section: "Main Hall", capacity: 6 },
        { id: "tbl_6", name: "Table 6", section: "Window View", capacity: 2 },
        { id: "tbl_7", name: "Table 7", section: "Window View", capacity: 4 },
        { id: "tbl_8", name: "Table 8", section: "Window View", capacity: 4 },
        { id: "tbl_vip1", name: "VIP Table 1", section: "VIP Lounge", capacity: 8 },
        { id: "tbl_vip2", name: "VIP Table 2", section: "VIP Lounge", capacity: 10 },
        { id: "tbl_bq1", name: "Banquet Hall", section: "Event Area", capacity: 30 },
      ];
    }

    // Bar preset locations
    const barLocations = [
      { id: "bar_main", name: "Bar Counter #1 (Main)", section: "Bar Counter" },
      { id: "bar_counter2", name: "Bar Counter #2", section: "Bar Counter" },
      { id: "bar_lounge", name: "Lounge Bar", section: "Lounge" },
      { id: "bar_pool", name: "Poolside Bar", section: "Poolside" },
      { id: "bar_terrace", name: "Terrace Bar", section: "Rooftop" },
    ];

    // Other preset locations
    const otherLocations = [
      { id: "oth_takeaway", name: "Takeaway / Parcel Box" },
      { id: "oth_staff", name: "Front Desk / Staff Pantry" },
      { id: "oth_lobby", name: "Lobby Waiting Lounge" },
      { id: "oth_pool", name: "Poolside Sunbeds" },
      { id: "oth_garden", name: "Garden Lawn & Gazebo" },
      { id: "oth_driver", name: "Driver / Vendor Canteen" },
    ];

    // Fetch recent KOTs (last 40)
    const recentKots = await prisma.kOT.findMany({
      where: { propertyId: property.id },
      include: {
        order: {
          include: {
            table: true,
            stay: { include: { primaryGuest: true } },
          },
        },
        station: true,
        lines: {
          include: { orderItem: true },
        },
      },
      orderBy: { firedAt: "desc" },
      take: 40,
    });

    const formattedKots = recentKots.map((k) => {
      const mode = k.order?.mode || "DINE_IN";
      let destinationTitle = "Dining";
      let destinationSubtitle = "";

      if (k.order?.customerName?.includes("Room")) {
        destinationTitle = k.order.customerName;
      } else if (mode === "ROOM_SERVICE") {
        destinationTitle = `Room Service (${k.order?.customerName || "In-House"})`;
      } else if (k.order?.table?.name) {
        destinationTitle = `${k.order.table.name} (Dine-in)`;
        destinationSubtitle = `${k.order.covers || 2} Covers`;
      } else if (k.order?.customerName) {
        destinationTitle = k.order.customerName;
      } else {
        destinationTitle = `Order #${k.order?.orderNo || "POS"}`;
      }

      const totalItemsCount = k.lines.reduce((acc, l) => acc + l.qty, 0);

      return {
        id: k.id,
        kotNo: k.kotNo,
        orderId: k.orderId,
        orderNo: k.order?.orderNo || "N/A",
        status: k.status,
        printStatus: k.printStatus,
        reprintCount: k.reprintCount,
        firedAt: k.firedAt,
        stationName: k.station?.name || "Hot Kitchen",
        mode,
        destinationTitle,
        destinationSubtitle,
        waiterName: k.order?.waiterId || "Steward",
        lines: k.lines.map((l) => ({
          id: l.id,
          name: l.orderItem?.nameSnapshot || "Dish",
          qty: l.qty,
          notes: l.notesSnapshot || l.orderItem?.notes || undefined,
          unitPrice: l.orderItem?.unitPrice || 0,
          total: l.orderItem?.total || 0,
        })),
        totalItemsCount,
        totalAmount: k.lines.reduce((sum, l) => sum + (l.orderItem?.total || 0), 0),
      };
    });

    return NextResponse.json({
      success: true,
      property: {
        id: property.id,
        code: property.code,
        displayName: property.displayName || property.legalName || "Hotel Ambarish Grand Residency",
        legalName: property.legalName,
        address: property.address,
        phone: property.phone,
        stateCode: property.stateCode || "18",
      },
      outlet: outlet ? { id: outlet.id, name: outlet.name, code: outlet.code } : null,
      categories,
      items: allItems,
      rooms,
      tables,
      barLocations,
      otherLocations,
      recentKots: formattedKots,
    });
  } catch (error: any) {
    console.error("Error initializing POS data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
