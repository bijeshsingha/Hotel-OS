import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { fireKOT, postOrderToRoomFolio } from "@/lib/domain/pos-service";

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
    let prop = await prisma.property.findFirst({
      where: propertyId ? { id: propertyId } : { code: "GUW-01" },
      include: { outlets: true },
    });
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
      const itemTotal = item.unitPrice * item.qty;
      subtotal += itemTotal;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          nameSnapshot: item.name + (item.notes ? ` (${item.notes})` : ""),
          qty: item.qty,
          unitPrice: item.unitPrice,
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
        estimatedDeliveryMins: 40,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Guest order placement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
