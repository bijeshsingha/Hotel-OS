import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fireKOT, postOrderToRoomFolio } from "@/lib/domain/pos-service";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { calculateGST } from "@/lib/gst/calculator";

// GET /api/v1/pos/kots - Fetch recent KOTs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const kots = await prisma.kOT.findMany({
      where: propertyId ? { propertyId } : {},
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
      take: 50,
    });

    const formatted = kots.map((k) => {
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

    return NextResponse.json({ success: true, kots: formatted });
  } catch (error: any) {
    console.error("Error fetching KOTs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/v1/pos/kots - Place Order & Fire KOT
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      outletId,
      destinationType = "ROOM", // ROOM, BAR, TABLE, OTHER
      destinationDetail,
      roomNumber,
      stayId,
      guestName,
      customerContact,
      waiterName = "Steward",
      covers = 2,
      items,
      paymentPreference = "POST_TO_ROOM", // POST_TO_ROOM, CASH, UPI, CARD, UNSETTLED
      kitchenInstructions,
      actorId,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Order must have at least one item." }, { status: 400 });
    }

    const prop = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: {
        outlets: {
          include: { kitchenStations: true },
        },
      },
    });

    const outlet = outletId
      ? prop.outlets.find((o) => o.id === outletId) || prop.outlets[0]
      : prop.outlets[0];

    if (!outlet) {
      return NextResponse.json({ error: "No restaurant outlet found on property." }, { status: 400 });
    }

    // Determine Mode & Destination Label
    let mode: "ROOM_SERVICE" | "DINE_IN" | "TAKEAWAY" = "DINE_IN";
    let formattedCustomerName = "";

    if (destinationType === "ROOM") {
      mode = "ROOM_SERVICE";
      formattedCustomerName = `Room ${roomNumber || destinationDetail}${guestName ? ` — ${guestName}` : ""}`;
    } else if (destinationType === "BAR") {
      mode = "DINE_IN";
      formattedCustomerName = `${destinationDetail || "Bar Counter"}${guestName ? ` (${guestName})` : ""}`;
    } else if (destinationType === "TABLE") {
      mode = "DINE_IN";
      formattedCustomerName = `${destinationDetail || "Table"}${guestName ? ` (${guestName})` : ""}`;
    } else {
      mode = "TAKEAWAY";
      formattedCustomerName = `${destinationDetail || "Other / Takeaway"}${guestName ? ` (${guestName})` : ""}`;
    }

    // 1. Generate Order sequence
    const orderSeq = await getNextDocumentNumber(prop.id, "ORDER");

    // 2. Create Order
    const order = await prisma.order.create({
      data: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        orderNo: orderSeq.formattedNumber,
        outletId: outlet.id,
        mode,
        stayId: stayId || null,
        customerName: formattedCustomerName,
        customerContact: customerContact || null,
        covers: Number(covers) || 2,
        waiterId: waiterName || "Steward",
        status: "OPEN",
      },
    });

    // 3. Create Order Items
    let subtotal = 0;
    const defaultStationId = outlet.kitchenStations[0]?.id || null;

    for (const item of items) {
      const qty = Math.max(Number(item.qty) || 1, 1);
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: item.menuItemId || null,
          variantId: item.variantId || null,
          nameSnapshot: item.name + (item.notes ? ` (${item.notes})` : ""),
          qty: qty,
          unitPrice: unitPrice,
          total: itemTotal,
          stationId: item.stationId || defaultStationId,
          status: "DRAFT",
          notes: item.notes || null,
          course: item.course || "MAIN",
        },
      });
    }

    // 4. Calculate GST (SAC 996331 Restaurant Supply 5%)
    const gst = calculateGST({
      grossOrBaseAmount: subtotal,
      sacHsn: "996331",
      supplierStateCode: prop.stateCode || "18",
    });

    // 5. Fire KOT to Kitchen Stations
    const generatedKots = await fireKOT({
      orderId: order.id,
      actorId: actorId || "usr_pos",
    });

    // 6. If Post to Room selected and stayId provided, post to Folio Window
    let folioPosted = false;
    let folioEntryId = null;

    if (destinationType === "ROOM" && paymentPreference === "POST_TO_ROOM" && stayId) {
      try {
        const postResult = await postOrderToRoomFolio({
          orderId: order.id,
          stayId,
          actorId: actorId || "usr_pos",
        });
        folioPosted = true;
        folioEntryId = postResult.folioEntry.id;
      } catch (folioErr) {
        console.warn("Folio posting error:", folioErr);
      }
    }

    // 7. Format KOT Slip for instant thermal printing
    const primaryKot = generatedKots[0];
    const kotSlipData = {
      kotNo: primaryKot?.kotNo || `KOT-${order.orderNo.replace("ORD-", "")}`,
      orderNo: order.orderNo,
      outletName: outlet.name,
      stationName: primaryKot?.stationId ? outlet.kitchenStations.find(s => s.id === primaryKot.stationId)?.name || "Hot Kitchen" : "Main Kitchen",
      mode,
      roomNumber: destinationType === "ROOM" ? (roomNumber || destinationDetail) : undefined,
      tableName: destinationType === "TABLE" ? destinationDetail : destinationType === "BAR" ? destinationDetail : undefined,
      guestName: guestName || (destinationType === "ROOM" ? "In-House Guest" : destinationType === "BAR" ? "Bar Guest" : "Dine-In Guest"),
      waiterName: waiterName || "Steward",
      firedAt: new Date().toISOString(),
      lines: items.map((i: any) => ({
        name: i.name,
        qty: Math.max(Number(i.qty) || 1, 1),
        notes: [i.notes, kitchenInstructions].filter(Boolean).join(" • ") || undefined,
      })),
    };

    // 8. Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        action: "POS_KOT_FIRED",
        actorId: actorId || "usr_pos",
        actorName: waiterName || "Steward",
        targetType: "KOT",
        targetId: primaryKot?.kotNo || order.orderNo,
        afterJson: JSON.stringify({
          orderNo: order.orderNo,
          destination: formattedCustomerName,
          totalAmount: gst.totalAmount,
          folioPosted,
          itemCount: items.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      order,
      kots: generatedKots,
      kotSlip: kotSlipData,
      folioPosted,
      folioEntryId,
      subtotal: gst.taxableAmount,
      taxAmount: gst.taxAmount,
      totalAmount: gst.totalAmount,
    });
  } catch (error: any) {
    console.error("Error firing KOT in POS:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
