import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { fireKOT, postOrderToRoomFolio } from "@/lib/domain/pos-service";

function computeOrderTracker(order: any, propStateCode = "18") {
  const createdAt = new Date(order.createdAt);
  const now = new Date();
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000));

  // Determine stage/step from order status and KOTs
  // Step 1: Confirmed / KOT Sent
  // Step 2: Preparing / Cooking
  // Step 3: Out for Delivery / Plated
  // Step 4: Delivered to Room
  let step = 1;
  let statusText = "ORDER_CONFIRMED";
  let statusLabel = "Order Confirmed";
  let statusDescription = "KOT ticket sent to kitchen. Chefs are preparing your workstation.";

  const orderStatusUpper = (order.status || "").toUpperCase();
  const kotStatuses = (order.kots || []).map((k: any) => (k.status || "").toUpperCase());
  const anyKotPreparing = kotStatuses.some((s: string) => s === "PREPARING" || s === "ACKNOWLEDGED");
  const allKotsReady = kotStatuses.length > 0 && kotStatuses.every((s: string) => s === "READY" || s === "COMPLETED");
  const anyKotReady = kotStatuses.some((s: string) => s === "READY");

  if (orderStatusUpper === "DELIVERED" || orderStatusUpper === "COMPLETED") {
    step = 4;
    statusText = "DELIVERED";
    statusLabel = "Delivered to Room";
    statusDescription = "Your fresh meal has been delivered to your room. Enjoy your dining experience!";
  } else if (
    orderStatusUpper === "OUT_FOR_DELIVERY" ||
    orderStatusUpper === "READY" ||
    allKotsReady ||
    anyKotReady ||
    elapsedMinutes >= 25
  ) {
    step = 3;
    statusText = "OUT_FOR_DELIVERY";
    statusLabel = "Out for Delivery";
    statusDescription = "Meal is freshly plated and the room service runner is bringing the tray to your room.";
  } else if (orderStatusUpper === "PREPARING" || anyKotPreparing || elapsedMinutes >= 8) {
    step = 2;
    statusText = "PREPARING";
    statusLabel = "Cooking in Kitchen";
    statusDescription = "Chefs are actively preparing and cooking your fresh dishes on the station.";
  } else {
    step = 1;
    statusText = "CONFIRMED";
    statusLabel = "Order Confirmed";
    statusDescription = "KOT ticket received by kitchen. Workstation preparation initiated.";
  }

  // Estimated Delivery calculations
  const totalPrepTimeMinutes = 35;
  let estimatedMinutesRemaining = 0;
  if (step === 1) {
    estimatedMinutesRemaining = Math.max(20, totalPrepTimeMinutes - elapsedMinutes);
  } else if (step === 2) {
    estimatedMinutesRemaining = Math.max(10, 22 - Math.max(0, elapsedMinutes - 8));
  } else if (step === 3) {
    estimatedMinutesRemaining = Math.max(2, 6 - Math.max(0, elapsedMinutes - 25));
  } else {
    estimatedMinutesRemaining = 0;
  }

  const expectedDeliveryDate = new Date(createdAt.getTime() + totalPrepTimeMinutes * 60000);
  const expectedDeliveryTimeStr = expectedDeliveryDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const progressPercentage = step === 1 ? 25 : step === 2 ? 60 : step === 3 ? 88 : 100;

  // Extract Room number
  let roomNo = "";
  const match = order.customerName?.match(/Room\s*([A-Za-z0-9_-]+)/i);
  if (match) {
    roomNo = match[1];
  }

  // Calculate totals
  let subtotal = 0;
  (order.items || []).forEach((it: any) => {
    subtotal += Number(it.total || it.unitPrice * it.qty || 0);
  });
  const gst = calculateGST({
    grossOrBaseAmount: subtotal,
    sacHsn: "996331",
    supplierStateCode: propStateCode,
  });

  return {
    id: order.id,
    orderNo: order.orderNo,
    roomNumber: roomNo,
    customerName: order.customerName,
    step,
    statusText,
    statusLabel,
    statusDescription,
    elapsedMinutes,
    estimatedMinutesRemaining,
    estimatedDeliveryTime: expectedDeliveryTimeStr,
    progressPercentage,
    totalPrepTimeMinutes,
    orderedAtFormatted: createdAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    orderedDateFormatted: createdAt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    createdAt: order.createdAt,
    subtotal: gst.taxableAmount,
    taxTotal: gst.taxAmount,
    totalAmount: gst.totalAmount,
    itemsCount: (order.items || []).length,
    items: (order.items || []).map((it: any) => ({
      id: it.id,
      name: it.nameSnapshot,
      qty: it.qty,
      unitPrice: it.unitPrice,
      total: it.total,
      notes: it.notes,
      status: it.status,
    })),
    kots: (order.kots || []).map((k: any) => ({
      id: k.id,
      kotNo: k.kotNo,
      status: k.status,
      stationName: k.station?.name,
      firedAt: k.firedAt,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomParam = searchParams.get("room");
    const orderIdParam = searchParams.get("orderId");
    const propertyParam =
      searchParams.get("property") ||
      searchParams.get("propertyCode") ||
      searchParams.get("code") ||
      searchParams.get("propertyId");

    let whereClause: any = {
      mode: "ROOM_SERVICE",
    };

    if (propertyParam) {
      const cleanParam = propertyParam.trim().toUpperCase();
      const prop = await prisma.property.findFirst({
        where: {
          OR: [{ id: propertyParam }, { code: cleanParam }],
        },
      });
      if (prop) {
        whereClause.propertyId = prop.id;
      }
    }

    if (orderIdParam) {
      whereClause.OR = [{ id: orderIdParam }, { orderNo: orderIdParam }];
    } else if (roomParam) {
      whereClause.customerName = {
        contains: `Room ${roomParam.trim()}`,
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        kots: {
          include: {
            station: true,
          },
        },
        bills: true,
        property: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const enrichedOrders = orders.map((o) => computeOrderTracker(o, o.property?.stateCode || "18"));

    const activeOrders = enrichedOrders.filter((o) => o.step < 4);
    const pastOrders = enrichedOrders.filter((o) => o.step === 4);

    return NextResponse.json({
      success: true,
      count: enrichedOrders.length,
      activeCount: activeOrders.length,
      latestActiveOrder: activeOrders[0] || null,
      activeOrders,
      pastOrders,
      orders: enrichedOrders,
    });
  } catch (error: any) {
    console.error("Guest get orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      roomNumber,
      customerName,
      customerContact,
      items, // Array of { id, name, unitPrice, qty, notes, stationId }
      paymentPreference = "POST_TO_ROOM", // "POST_TO_ROOM", "UPI_ON_DELIVERY", "CASH_ON_DELIVERY"
      specialInstructions = "",
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order cart is empty" }, { status: 400 });
    }

    if (!roomNumber) {
      return NextResponse.json({ error: "Room number is required for in-room dining delivery." }, { status: 400 });
    }

    // 1. Find the property & room
    const targetPropKey = (body.property || body.propertyCode || body.code || body.propertyId || propertyId || "").trim();
    let prop = null;
    if (targetPropKey) {
      prop = await prisma.property.findFirst({
        where: {
          OR: [{ id: targetPropKey }, { code: targetPropKey.toUpperCase() }],
        },
        include: { outlets: true },
      });
    }
    if (!prop) {
      prop = await prisma.property.findFirst({
        where: { code: "GUW-01" },
        include: { outlets: true },
      });
    }
    if (!prop) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const room = await prisma.room.findFirst({
      where: {
        propertyId: prop.id,
        number: String(roomNumber).trim(),
      },
      include: {
        assignments: {
          where: { endsAt: null },
          include: {
            stay: {
              include: {
                primaryGuest: true,
                folio: {
                  include: { windows: true },
                },
              },
            },
          },
        },
      },
    });

    const activeStay = room?.assignments[0]?.stay || null;
    const guestName = customerName || activeStay?.primaryGuest?.name || `Guest Room ${roomNumber}`;
    const guestPhone = customerContact || activeStay?.primaryGuest?.phone || "";

    const outlet = prop.outlets[0];
    if (!outlet) {
      return NextResponse.json({ error: "Restaurant outlet not configured." }, { status: 404 });
    }

    // 2. Generate sequential Order Number
    const orderSeq = await getNextDocumentNumber(prop.id, "ORDER");

    // 3. Create the Room Service Order
    const order = await prisma.order.create({
      data: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        orderNo: orderSeq.formattedNumber,
        outletId: outlet.id,
        mode: "ROOM_SERVICE",
        stayId: activeStay?.id || null,
        customerName: `${guestName} (Room ${roomNumber})`,
        customerContact: guestPhone,
        covers: 2,
        status: "OPEN",
      },
    });

    // 4. Create Order Items
    let subtotal = 0;
    for (const item of items) {
      const qty = Math.max(Number(item.qty) || 1, 1);
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          nameSnapshot: item.name + (item.notes ? ` (${item.notes})` : ""),
          qty: qty,
          unitPrice: unitPrice,
          total: itemTotal,
          stationId: item.stationId || null,
          status: "DRAFT",
          notes: item.notes || null,
        },
      });
    }

    // 5. Calculate GST (SAC 996331 Restaurant Supply 5%)
    const gst = calculateGST({
      grossOrBaseAmount: subtotal,
      sacHsn: "996331",
      supplierStateCode: prop.stateCode || "18",
    });

    // 6. Fire KOT to Kitchen Stations (Updates Kitchen Display System in real-time)
    const kots = await fireKOT({ orderId: order.id });

    // 7. If Post to Room selected and active stay exists, post to Folio Window
    let folioPosted = false;
    if (paymentPreference === "POST_TO_ROOM" && activeStay?.folio) {
      try {
        await postOrderToRoomFolio({
          orderId: order.id,
          stayId: activeStay.id,
        });
        folioPosted = true;
      } catch (folioErr) {
        console.warn("Folio posting note:", folioErr);
      }
    }

    // 8. Log Audit event
    await prisma.auditLog.create({
      data: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        action: "GUEST_IN_ROOM_ORDER_PLACED",
        actorId: `GUEST_ROOM_${roomNumber}`,
        actorName: guestName,
        targetType: "Order",
        targetId: order.id,
        afterJson: JSON.stringify({
          orderNo: order.orderNo,
          roomNumber,
          totalAmount: gst.totalAmount,
          itemCount: items.length,
          paymentPreference,
          folioPosted,
          instructions: specialInstructions,
        }),
      },
    });

    // Compute live tracker payload
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        kots: { include: { station: true } },
      },
    });

    const tracker = computeOrderTracker(fullOrder || order, prop.stateCode || "18");

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        roomNumber,
        guestName,
        status: "KOT_SENT",
        subtotal: gst.taxableAmount,
        taxTotal: gst.taxAmount,
        totalAmount: gst.totalAmount,
        itemCount: items.length,
        kotsGenerated: kots.length,
        folioPosted,
        estimatedDeliveryMins: 35,
        tracker,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Guest order placement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH endpoint to advance / simulate kitchen order status for testing & POS runner updates
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status } = body; // "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: status.toUpperCase() },
      include: {
        items: true,
        kots: { include: { station: true } },
        property: true,
      },
    });

    // Also update KOTs if advancing
    if (status.toUpperCase() === "PREPARING") {
      await prisma.kOT.updateMany({
        where: { orderId: orderId },
        data: { status: "PREPARING" },
      });
    } else if (status.toUpperCase() === "OUT_FOR_DELIVERY" || status.toUpperCase() === "READY") {
      await prisma.kOT.updateMany({
        where: { orderId: orderId },
        data: { status: "READY", readyAt: new Date() },
      });
    } else if (status.toUpperCase() === "DELIVERED" || status.toUpperCase() === "COMPLETED") {
      await prisma.kOT.updateMany({
        where: { orderId: orderId },
        data: { status: "COMPLETED" },
      });
    }

    const tracker = computeOrderTracker(updated, updated.property?.stateCode || "18");

    return NextResponse.json({
      success: true,
      order: tracker,
    });
  } catch (error: any) {
    console.error("Guest order status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

