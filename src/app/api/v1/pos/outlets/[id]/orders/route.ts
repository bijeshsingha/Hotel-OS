import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createPOSOrder } from "@/lib/domain/pos-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: outletId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        ...(status ? { status } : {}),
      },
      include: {
        table: true,
        stay: { include: { primaryGuest: true } },
        items: true,
        kots: { include: { station: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: outletId } = await params;
    const body = await request.json();
    const { propertyId, mode, tableId, stayId, customerName, customerContact, covers, waiterId } = body;

    const order = await createPOSOrder({
      propertyId,
      outletId,
      mode,
      tableId,
      stayId,
      customerName,
      customerContact,
      covers: Number(covers) || 2,
      waiterId,
    });

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
