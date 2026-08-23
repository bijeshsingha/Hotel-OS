import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";

function computeOrderTracker(order: any, propStateCode = "18") {
  const createdAt = new Date(order.createdAt);
  const now = new Date();
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000));

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

  let roomNo = "";
  const match = order.customerName?.match(/Room\s*([A-Za-z0-9_-]+)/i);
  if (match) {
    roomNo = match[1];
  }

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNo: id }],
      },
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
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const tracker = computeOrderTracker(order, order.property?.stateCode || "18");
    return NextResponse.json({
      success: true,
      order: tracker,
    });
  } catch (error: any) {
    console.error("Get order status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
