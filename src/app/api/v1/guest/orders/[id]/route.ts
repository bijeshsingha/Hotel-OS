import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        kots: {
          include: {
            station: true,
            lines: {
              include: { orderItem: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Determine status for guest tracker:
    // If all KOTs READY -> READY_FOR_DELIVERY
    // If any KOT PREPARING -> PREPARING
    // If all KOTs COMPLETED -> DELIVERED
    // Else -> RECEIVED
    const kotStatuses = order.kots.map((k) => k.status);
    let trackerStep = 1;
    let stepTitle = "Order Received & Confirmed";
    let stepSubtitle = "Your order ticket has been sent to the kitchen.";

    if (kotStatuses.length > 0) {
      if (kotStatuses.every((s) => s === "COMPLETED") || order.status === "PAID") {
        trackerStep = 3;
        stepTitle = "Delivered / Served";
        stepSubtitle = "Your meal has been delivered to your room. Enjoy your meal!";
      } else if (kotStatuses.some((s) => s === "READY")) {
        trackerStep = 2;
        stepTitle = "Freshly Prepared & On the Way";
        stepSubtitle = "Your food is ready and our staff is heading to your room.";
      } else if (kotStatuses.some((s) => s === "PREPARING")) {
        trackerStep = 2;
        stepTitle = "Cooking in Kitchen";
        stepSubtitle = "Our chefs are preparing your fresh meal (40 min preparation).";
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items,
        kotsCount: order.kots.length,
        tracker: {
          step: trackerStep,
          title: stepTitle,
          subtitle: stepSubtitle,
          estimatedTimeMins: 40,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
